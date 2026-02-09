# backend/main.py

# --- 1. IMPORTACIONES ---
import hashlib
import os
import io
import jwt 
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

# Librerías de Terceros
import qrcode
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, Form
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from pydantic import BaseModel
from passlib.context import CryptContext 
from reportlab.lib.units import mm             
from reportlab.graphics.barcode import qr     
from reportlab.graphics import renderPDF    
from reportlab.graphics.shapes import Drawing  

# Importaciones Locales
# AÑADIDO: Cliente, Producto
from models import SessionLocal, RegistroFactura, ConfiguracionEmpresa, Usuario, EventoBitacora, Cliente, Producto, Suscripcion

# --- 2. CONFIGURACIÓN DE SEGURIDAD ---
SECRET_KEY = "clave_super_secreta_cambiar_en_produccion"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- 3. CONFIGURACIÓN DE LA APP ---
app = FastAPI(title="INALTERA API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 4. MODELOS DE DATOS ---
class LineaFactura(BaseModel):
    producto: str
    cantidad: int
    precio_unitario: float
    iva: int

class DatosFactura(BaseModel):
    cliente_nombre: str
    cliente_nif: str
    items: List[LineaFactura]
    notas: str = ""

class DatosEmpresa(BaseModel):
    razon_social: str
    nif: str
    direccion: str
    web: str

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SolicitudAnulacion(BaseModel):
    motivo: str

# --- NUEVOS SCHEMAS (CLIENTES Y PRODUCTOS) ---
class ClienteCreate(BaseModel):
    nombre: str
    nif: str
    direccion: str = ""
    email: str = ""

class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    iva_por_defecto: int = 21
    descripcion: str = ""

# --- 5. FUNCIONES AUXILIARES ---

def calcular_hash(contenido_archivo: bytes, hash_anterior: str) -> str:
    bloque_a_hashear = contenido_archivo + hash_anterior.encode('utf-8')
    return hashlib.sha256(bloque_a_hashear).hexdigest()

# === NUEVA FUNCIÓN: REGISTRAR EVENTO EN BITÁCORA ===
def registrar_evento(db: Session, categoria: str, descripcion: str, nivel: str = "INFO", usuario_id: int = None):
    """
    Crea un registro inalterable en la cadena de eventos (Bitácora).
    """
    # 1. Obtener último hash de bitácora (ChainLogs)
    ultimo_evento = db.query(EventoBitacora).order_by(EventoBitacora.id.desc()).first()
    prev_hash = ultimo_evento.hash_actual if ultimo_evento else "0" * 64
    
    # 2. Crear contenido para hashear (Timestamp + Datos)
    timestamp = datetime.utcnow().isoformat()
    contenido = f"{timestamp}{categoria}{descripcion}{usuario_id}".encode('utf-8')
    nuevo_hash = calcular_hash(contenido, prev_hash)
    
    # 3. Guardar evento
    evento = EventoBitacora(
        categoria=categoria,
        descripcion=descripcion,
        nivel=nivel,
        hash_anterior=prev_hash,
        hash_actual=nuevo_hash,
        usuario_id=usuario_id
    )
    db.add(evento)
    db.commit()

# === EVENTO DE ARRANQUE DEL SISTEMA ===
@app.on_event("startup")
async def startup_event():
    # Registramos que el sistema se ha encendido (Req. Veri*factu)
    db = SessionLocal()
    registrar_evento(db, "SISTEMA", "Sistema Inaltera iniciado correctamente (v2.2)", "INFO")
    db.close()

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- EL PORTERO (Valida el token y devuelve el usuario) ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- LÓGICA DE NEGOCIO (PDF, QR, HASH) ---

def estampar_qr(pdf_bytes: bytes, texto_qr: str) -> bytes:
    """
    Versión avanzada (Vectorial + Link):
    """
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)

    # --- CONFIGURACIÓN DE POSICIÓN ---
    qr_size = 25 * mm
    x_pos = 170 * mm  
    y_pos = 250 * mm  
    
    # 1. Generar el Gráfico del QR Vectorial
    qr_code = qr.QrCodeWidget(texto_qr)
    qr_code.barWidth = qr_size
    qr_code.barHeight = qr_size
    qr_code.qrVersion = 1

    d = Drawing(qr_size, qr_size)
    d.add(qr_code)

    # 2. Dibujar el QR
    renderPDF.draw(d, c, x_pos, y_pos)

    # 3. HIPERVÍNCULO
    rectangulo_click = (x_pos, y_pos, x_pos + qr_size, y_pos + qr_size)
    c.linkURL(texto_qr, rect=rectangulo_click)

    # 4. Texto
    c.setFont("Helvetica", 6)
    c.drawString(x_pos, y_pos - 3*mm, "Verificar doc:")
    c.setFont("Helvetica-Oblique", 6)
    c.setFillColorRGB(0, 0, 1)
    c.drawString(x_pos, y_pos - 6*mm, "verificar en blockchain")
    
    c.save()

    # 5. Fusionar
    packet.seek(0)
    new_pdf = PdfReader(packet)
    existing_pdf = PdfReader(io.BytesIO(pdf_bytes))
    output = PdfWriter()

    for i in range(len(existing_pdf.pages)):
        page = existing_pdf.pages[i]
        if i == 0: page.merge_page(new_pdf.pages[0])
        output.add_page(page)

    salida = io.BytesIO()
    output.write(salida)
    return salida.getvalue()

def generar_pdf_fisico(datos: DatosFactura, config_empresa: ConfiguracionEmpresa) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Usamos datos de la empresa o defaults
    razon_social = config_empresa.razon_social if config_empresa else "EMPRESA SIN CONFIGURAR"
    direccion = config_empresa.direccion if config_empresa else "Dirección no disponible"
    nif = config_empresa.nif if config_empresa else ""
    web = config_empresa.web if config_empresa else ""

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, razon_social) 
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, direccion)   
    c.drawString(50, height - 85, f"NIF: {nif}") 
    c.drawString(50, height - 100, web)        

    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, height - 50, "FACTURA A:")
    c.setFont("Helvetica", 10)
    
    cli_nombre = datos.cliente_nombre or "Cliente Genérico"
    cli_nif = datos.cliente_nif or ""
    c.drawString(350, height - 70, cli_nombre)
    c.drawString(350, height - 85, f"NIF: {cli_nif}")
    c.drawString(350, height - 110, f"Fecha: {datetime.now().strftime('%d/%m/%Y')}")

    y = height - 160
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Descripción")
    c.drawString(300, y, "Cant.")
    c.drawString(350, y, "Precio")
    c.drawString(480, y, "Total")
    c.line(50, y - 5, 550, y - 5)
    
    y -= 25
    c.setFont("Helvetica", 10)
    total = 0
    for item in datos.items:
        subtotal = item.cantidad * item.precio_unitario * (1 + item.iva/100)
        total += subtotal
        c.drawString(50, y, (item.producto or "Item")[:40]) 
        c.drawString(300, y, str(item.cantidad))
        c.drawString(350, y, f"{item.precio_unitario:.2f}")
        c.drawString(480, y, f"{subtotal:.2f}")
        y -= 20

    c.line(350, y - 10, 550, y - 10)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(350, y-30, "TOTAL:")
    c.drawString(480, y-30, f"{total:.2f}€")
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

# --- 6. ENDPOINTS ---

@app.post("/api/register")
def registrar_usuario(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(Usuario).filter(Usuario.email == user.email).first()
    if db_user:
        return {"error": "El correo ya está registrado"}
    
    hashed_pwd = pwd_context.hash(user.password)
    nuevo_usuario = Usuario(email=user.email, hashed_password=hashed_pwd)
    
    try:
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        
        # LOG
        registrar_evento(db, "SEGURIDAD", f"Nuevo usuario registrado: {user.email}", "INFO", nuevo_usuario.id)
        
        return {"status": "Usuario creado", "email": nuevo_usuario.email}
    except Exception as e:
        return {"error": "Error interno al guardar usuario"}

@app.post("/api/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        # Podríamos loguear intentos fallidos, pero cuidado con saturar la DB
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # LOG
    registrar_evento(db, "LOGIN", "Inicio de sesión exitoso", "INFO", user.id)
    
    access_token = crear_token_acceso(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- 7. ENDPOINTS DE EMPRESA (Protegidos por Usuario) ---

@app.get("/api/empresa")
def obtener_config(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    config = db.query(ConfiguracionEmpresa).filter(ConfiguracionEmpresa.usuario_id == current_user.id).first()
    if not config:
        config = ConfiguracionEmpresa(usuario_id=current_user.id)
        db.add(config)
        db.commit()
    return config

@app.post("/api/empresa")
def guardar_config(datos: DatosEmpresa, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    config = db.query(ConfiguracionEmpresa).filter(ConfiguracionEmpresa.usuario_id == current_user.id).first()
    if not config:
        config = ConfiguracionEmpresa(usuario_id=current_user.id)
        db.add(config)
    
    config.razon_social = datos.razon_social
    config.nif = datos.nif
    config.direccion = datos.direccion
    config.web = datos.web
    db.commit()
    
    # LOG
    registrar_evento(db, "CONFIG", "Datos de empresa actualizados", "INFO", current_user.id)
    
    return {"status": "Configuración actualizada", "datos": config}

# --- 8. ENDPOINTS DE FACTURACIÓN (Protegidos y Multi-usuario) ---

@app.post("/api/emitir")
async def emitir_factura(datos: DatosFactura, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    # 1. Configuración Empresa
    config = db.query(ConfiguracionEmpresa).filter(ConfiguracionEmpresa.usuario_id == current_user.id).first()

    # 2. CALCULAR TOTALES
    total_factura = 0
    for item in datos.items:
        base = item.cantidad * item.precio_unitario
        total_linea = base * (1 + item.iva / 100)
        total_factura += total_linea

    # 3. Generar PDF
    pdf_bytes = generar_pdf_fisico(datos, config)
    
    # 4. Criptografía (Blockchain Facturas)
    ultimo_registro = db.query(RegistroFactura).order_by(RegistroFactura.id.desc()).first()
    prev_hash = ultimo_registro.hash_actual if ultimo_registro else "0" * 64
    nuevo_hash = calcular_hash(pdf_bytes, prev_hash)
    
    texto_qr = f"{FRONTEND_URL}/verificar?h={nuevo_hash}"

    # 5. GUARDAR EN DB
    num_factura = f"F-{datetime.now().strftime('%Y%m%d-%H%M')}"
    
    nuevo_registro = RegistroFactura(
        nombre_archivo=f"{num_factura}.pdf",
        numero_factura=num_factura,
        cliente=datos.cliente_nombre,
        total=total_factura,
        hash_anterior=prev_hash,
        hash_actual=nuevo_hash,
        datos_qr=texto_qr,
        usuario_id=current_user.id
    )
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    
    # LOG (Blockchain Eventos)
    registrar_evento(db, "FACTURACION", f"Factura emitida: {num_factura} ({total_factura:.2f}€)", "INFO", current_user.id)

    # 6. Guardar Archivo Físico
    pdf_sellado = estampar_qr(pdf_bytes, texto_qr)
    nombre_fisico = f"{nuevo_registro.id}_{nuevo_registro.nombre_archivo}"
    Path("uploads").mkdir(exist_ok=True)
    with open(Path("uploads") / nombre_fisico, "wb") as f:
        f.write(pdf_sellado)

    return {
        "status": "Exito",
        "mensaje": "Factura generada y guardada",
        "datos_trazabilidad": {"id": nuevo_registro.id, "hash": nuevo_hash}
    }

# --- ENDPOINT RF2: SUBIR Y LEGALIZAR FACTURA DE TERCEROS (CORREGIDO FINAL) ---
@app.post("/api/subir-factura")
def subir_factura_terceros(
    file: UploadFile = File(...),
    numero: str = Form(...),
    cliente: str = Form(...),
    total: float = Form(...),
    fecha: str = Form(...),
    db: Session = Depends(get_db),
    u: Usuario = Depends(get_current_user)
):
    # 1. Obtener NIF
    config = db.query(ConfiguracionEmpresa).filter(ConfiguracionEmpresa.usuario_id == u.id).first()
    nif_emisor = config.nif if config else "NIF_NO_CONFIGURADO"

    # 2. Leer PDF
    pdf_content = file.file.read()
    
    # 3. Hash Anterior
    ultimo_registro = db.query(RegistroFactura).order_by(RegistroFactura.id.desc()).first()
    prev_hash = ultimo_registro.hash_actual if ultimo_registro else "0"*64

    # 4. Hash Actual
    datos_para_hash = f"{nif_emisor}{numero}{fecha}{total}{prev_hash}"
    nuevo_hash = hashlib.sha256(datos_para_hash.encode()).hexdigest()

    # 5. Texto QR
    texto_qr = f"{FRONTEND_URL}/verificar?h={nuevo_hash}"

    # 6. Parsear fecha
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
    except:
        fecha_obj = datetime.utcnow()

    # 7. Definir nombre base (SIN ID todavía)
    nombre_final = f"{numero}_{nuevo_hash[:8]}.pdf".replace("/", "-")

    # 8. GUARDAR EN DB PRIMERO (Para conseguir el ID)
    nuevo_registro = RegistroFactura(
        nombre_archivo=nombre_final,
        numero_factura=numero,
        cliente=cliente,
        total=total,
        fecha_subida=fecha_obj,
        hash_anterior=prev_hash,
        hash_actual=nuevo_hash,
        datos_qr=texto_qr,
        usuario_id=u.id,
        tipo="Externa"
    )
    
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro) # ¡Aquí obtenemos el ID!

    # 9. AHORA SÍ: ESTAMPAR Y GUARDAR FICHERO (Con el ID delante)
    try:
        pdf_sellado = estampar_qr(pdf_content, texto_qr)
        
        # EL CAMBIO CLAVE: Añadimos el ID al nombre del archivo físico
        nombre_fisico = f"{nuevo_registro.id}_{nombre_final}"
        path_final = Path("uploads") / nombre_fisico
        
        Path("uploads").mkdir(exist_ok=True)
        
        with open(path_final, "wb") as f:
            f.write(pdf_sellado)
            
    except Exception as e:
        print(f"Error procesando PDF: {e}")
        # Si falla, borramos el registro para no dejar "fantasmas"
        db.delete(nuevo_registro)
        db.commit()
        raise HTTPException(status_code=500, detail="Error al estampar el QR en el PDF")
    
    # Log
    registrar_evento(db, "FACTURACION", f"Factura externa legalizada: {numero}", "INFO", u.id)
    
    return {
        "status": "Exito", 
        "mensaje": "Factura legalizada correctamente", 
        "id": nuevo_registro.id
    }

@app.get("/api/registros")
def leer_registros(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return db.query(RegistroFactura).filter(RegistroFactura.usuario_id == current_user.id).all()

# --- ENDPOINT DE ANULACIÓN (Protegido) ---
@app.post("/api/anular/{registro_id}")
def anular_factura(registro_id: int, solicitud: SolicitudAnulacion, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    # 1. Buscar factura y VERIFICAR PROPIEDAD
    factura_original = db.query(RegistroFactura).filter(
        RegistroFactura.id == registro_id,
        RegistroFactura.usuario_id == current_user.id 
    ).first()
    
    if not factura_original:
        raise HTTPException(status_code=404, detail="Factura no encontrada o no tienes permiso")
    
    if factura_original.estado == "Anulada":
        raise HTTPException(status_code=400, detail="Esta factura ya está anulada")

    # 2. Blockchain Global
    ultimo_registro = db.query(RegistroFactura).order_by(RegistroFactura.id.desc()).first()
    prev_hash = ultimo_registro.hash_actual if ultimo_registro else "0" * 64
    
    contenido_anulacion = f"ANULACION_{factura_original.numero_factura}_{solicitud.motivo}".encode('utf-8')
    nuevo_hash = calcular_hash(contenido_anulacion, prev_hash)
    
    # 3. Registro Anulación
    registro_anulacion = RegistroFactura(
        nombre_archivo=f"ANULACION_{factura_original.numero_factura}",
        numero_factura=factura_original.numero_factura,
        cliente=factura_original.cliente,
        total= -factura_original.total,
        tipo="Anulacion",
        estado="Evento de Anulación",
        motivo_anulacion=solicitud.motivo,
        hash_anterior=prev_hash,
        hash_actual=nuevo_hash,
        datos_qr="Registro de Anulación - Sin QR físico",
        usuario_id=current_user.id 
    )
    
    factura_original.estado = "Anulada"
    db.add(registro_anulacion)
    db.commit()
    
    # LOG
    registrar_evento(db, "ANULACION", f"Factura {factura_original.numero_factura} anulada. Motivo: {solicitud.motivo}", "WARNING", current_user.id)
    
    return {"status": "Anulada", "mensaje": "Factura anulada y evento registrado en la cadena."}

@app.get("/api/download/{registro_id}")
def descargar(registro_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    reg = db.query(RegistroFactura).filter(RegistroFactura.id == registro_id).first()
    
    if not reg or reg.usuario_id != current_user.id:
        return {"error": "No encontrada o acceso denegado"}
        
    ruta = Path("uploads") / f"{reg.id}_{reg.nombre_archivo}"
    if not ruta.exists(): return {"error": "Archivo no existe"}
    
    # LOG DE AUDITORÍA
    registrar_evento(db, "DESCARGA", f"Descarga PDF factura {reg.numero_factura}", "INFO", current_user.id)
    
    return FileResponse(ruta, filename=reg.nombre_archivo)

@app.get("/api/download-json/{registro_id}")
def descargar_json(registro_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    registro = db.query(RegistroFactura).filter(
        RegistroFactura.id == registro_id,
        RegistroFactura.usuario_id == current_user.id
    ).first()
    
    if not registro: return {"error": "No encontrada o acceso denegado"}

    # LOG DE AUDITORÍA
    registrar_evento(db, "DESCARGA", f"Descarga JSON factura {registro.numero_factura}", "INFO", current_user.id)

    datos_estructurados = {
        "cabecera": {
            "id_registro": registro.id,
            "timestamp": registro.fecha_subida.isoformat(),
            "version_sif": "1.0"
        },
        "trazabilidad": {
            "hash_anterior": registro.hash_anterior,
            "hash_actual": registro.hash_actual,
            "algoritmo": "SHA-256"
        },
        "documento": {
            "nombre_archivo": registro.nombre_archivo,
            "url_qr": registro.datos_qr
        },
        "nota_legal": "Registro generado conforme al reglamento No-Verifactu (Real Decreto 1007/2023)."
    }

    json_str = json.dumps(datos_estructurados, indent=4, ensure_ascii=False)
    nombre_fichero = f"registro_{registro.id}_{registro.hash_actual[:8]}.json"
    
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={nombre_fichero}"}
    )

@app.get("/api/bitacora")
def leer_bitacora(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    # Devolvemos los eventos del usuario actual, ordenados del más reciente al más antiguo
    return db.query(EventoBitacora).filter(EventoBitacora.usuario_id == current_user.id).order_by(EventoBitacora.id.desc()).all()

from datetime import datetime, timedelta # Asegúrate de importar esto arriba

# --- GESTIÓN DE PLANES Y CONSUMO ---

@app.get("/api/uso-plan")
def obtener_uso_plan(db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    # 1. Obtener el plan del usuario (si no tiene, creamos uno ficticio Free)
    suscripcion = db.query(Suscripcion).filter(Suscripcion.usuario_id == u.id).first()
    nombre_plan = suscripcion.plan if suscripcion else "Free"
    
    # 2. Definir límites (Esto vendría de una tabla de configuración en el futuro)
    limites = {
        "Free": 5,
        "Basic": 20,
        "Pro": 1000
    }
    limite_actual = limites.get(nombre_plan, 5)

    # 3. Calcular fechas del mes actual (Desde el día 1 hasta hoy)
    hoy = datetime.utcnow()
    inicio_mes = datetime(hoy.year, hoy.month, 1)

    # 4. Contar facturas emitidas este mes
    # Filtramos por usuario y fecha >= inicio de mes
    consumo = db.query(RegistroFactura).filter(
        RegistroFactura.usuario_id == u.id,
        RegistroFactura.fecha_subida >= inicio_mes,
        RegistroFactura.tipo == "Alta"  
    ).count()

    return {
        "plan": nombre_plan,
        "consumo": consumo,
        "limite": limite_actual,
        "porcentaje": min(int((consumo / limite_actual) * 100), 100),
        "reset_date": (inicio_mes + timedelta(days=32)).replace(day=1).strftime("%d/%m/%Y") # Primer día del mes siguiente aprox
    }

# --- NUEVOS ENDPOINTS: GESTIÓN DE CLIENTES ---
@app.get("/api/clientes")
def leer_clientes(db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    return db.query(Cliente).filter(Cliente.usuario_id == u.id).all()

@app.post("/api/clientes")
def crear_cliente(dato: ClienteCreate, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    nuevo = Cliente(**dato.dict(), usuario_id=u.id)
    db.add(nuevo); db.commit(); db.refresh(nuevo)
    registrar_evento(db, "CONFIG", f"Cliente creado: {nuevo.nombre}", "INFO", u.id)
    return nuevo

# --- NUEVOS ENDPOINTS: GESTIÓN DE PRODUCTOS ---
@app.get("/api/productos")
def leer_productos(db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    return db.query(Producto).filter(Producto.usuario_id == u.id).all()

@app.post("/api/productos")
def crear_producto(dato: ProductoCreate, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    nuevo = Producto(**dato.dict(), usuario_id=u.id)
    db.add(nuevo); db.commit(); db.refresh(nuevo)
    registrar_evento(db, "CONFIG", f"Producto creado: {nuevo.nombre}", "INFO", u.id)
    return nuevo

# --- ZONA PÚBLICA (Verificación) ---
class ResultadoVerificacion(BaseModel):
    valido: bool
    mensaje: str
    datos: Optional[dict] = None

@app.get("/api/verificar-hash/{hash_string}", response_model=ResultadoVerificacion)
def verificar_hash_publico(hash_string: str, db: Session = Depends(get_db)):
    # Esto sigue siendo PÚBLICO
    registro = db.query(RegistroFactura).filter(RegistroFactura.hash_actual == hash_string).first()
    
    if not registro:
        return {
            "valido": False, 
            "mensaje": "El hash proporcionado NO consta en el registro de INALTERA."
        }
    
    return {
        "valido": True,
        "mensaje": "Documento verificado correctamente.",
        "datos": {
            "nombre_archivo": registro.nombre_archivo,
            "fecha_registro": registro.fecha_subida,
            "numero_factura": registro.numero_factura,
            "cliente": registro.cliente,
            "total": registro.total
        }
    }

    # --- EDICIÓN Y BORRADO DE CLIENTES ---

@app.put("/api/clientes/{cliente_id}")
def actualizar_cliente(cliente_id: int, dato: ClienteCreate, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.usuario_id == u.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente.nombre = dato.nombre
    cliente.nif = dato.nif
    cliente.direccion = dato.direccion
    cliente.email = dato.email
    db.commit()
    registrar_evento(db, "CONFIG", f"Cliente actualizado: {cliente.nombre}", "INFO", u.id)
    return cliente

@app.delete("/api/clientes/{cliente_id}")
def borrar_cliente(cliente_id: int, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.usuario_id == u.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(cliente)
    db.commit()
    registrar_evento(db, "CONFIG", "Cliente eliminado", "WARNING", u.id)
    return {"status": "Borrado"}

# --- EDICIÓN Y BORRADO DE PRODUCTOS ---

@app.put("/api/productos/{producto_id}")
def actualizar_producto(producto_id: int, dato: ProductoCreate, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    prod = db.query(Producto).filter(Producto.id == producto_id, Producto.usuario_id == u.id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    prod.nombre = dato.nombre
    prod.precio = dato.precio
    prod.iva_por_defecto = dato.iva_por_defecto
    prod.descripcion = dato.descripcion
    db.commit()
    registrar_evento(db, "CONFIG", f"Producto actualizado: {prod.nombre}", "INFO", u.id)
    return prod

@app.delete("/api/productos/{producto_id}")
def borrar_producto(producto_id: int, db: Session = Depends(get_db), u: Usuario = Depends(get_current_user)):
    prod = db.query(Producto).filter(Producto.id == producto_id, Producto.usuario_id == u.id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db.delete(prod)
    db.commit()
    registrar_evento(db, "CONFIG", "Producto eliminado", "WARNING", u.id)
    return {"status": "Borrado"}
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

# 1. Cargar variables de entorno
load_dotenv()

# 2. Obtener URL de la base de datos
# Si no encuentra la variable DATABASE_URL, usará sqlite local como respaldo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inaltera.db")

# 3. Configuración del Motor (Engine)
Base = declarative_base()

if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Configuración para PostgreSQL
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- MODELOS (TABLAS) ---

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    facturas = relationship("RegistroFactura", back_populates="propietario")
    configuracion = relationship("ConfiguracionEmpresa", back_populates="propietario")
    eventos = relationship("EventoBitacora", back_populates="usuario")
    clientes = relationship("Cliente", back_populates="propietario")
    productos = relationship("Producto", back_populates="propietario")

class RegistroFactura(Base):
    __tablename__ = "registros_facturacion"
    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String)
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    numero_factura = Column(String, default="S/N")
    cliente = Column(String, default="General")
    total = Column(Float, default=0.0)
    tipo = Column(String, default="Alta")
    estado = Column(String, default="Válida")
    motivo_anulacion = Column(String, nullable=True)
    hash_anterior = Column(String)
    hash_actual = Column(String)
    datos_qr = Column(String)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    propietario = relationship("Usuario", back_populates="facturas")

class ConfiguracionEmpresa(Base):
    __tablename__ = "configuracion_empresa"
    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String, default="Mi Empresa S.L.")
    nif = Column(String, default="B-00000000")
    direccion = Column(String, default="C/ Mi Dirección, 1")
    web = Column(String, default="www.miempresa.com")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    propietario = relationship("Usuario", back_populates="configuracion")

class EventoBitacora(Base):
    __tablename__ = "bitacora_eventos"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    categoria = Column(String) 
    descripcion = Column(String)
    nivel = Column(String, default="INFO")
    hash_anterior = Column(String)
    hash_actual = Column(String)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario = relationship("Usuario", back_populates="eventos")

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    nif = Column(String)
    direccion = Column(String, default="")
    email = Column(String, default="")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    propietario = relationship("Usuario", back_populates="clientes")

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    precio = Column(Float, default=0.0)
    iva_por_defecto = Column(Integer, default=21)
    descripcion = Column(String, default="")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    propietario = relationship("Usuario", back_populates="productos")

class Suscripcion(Base):
    __tablename__ = "suscripciones"
    id = Column(Integer, primary_key=True, index=True)
    plan = Column(String, default="Free") # Free, Basic, Pro
    estado = Column(String, default="Activo")
    fecha_renovacion = Column(DateTime, default=datetime.utcnow)
    stripe_id = Column(String, nullable=True) # Preparado para el futuro
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    # Necesitamos añadir la relación inversa en la clase Usuario si queremos navegar
    # Pero para este paso básico no es estrictamente necesario tocar la clase Usuario hoy.

Base.metadata.create_all(bind=engine)
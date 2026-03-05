import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { 
  Shield, 
  FileCheck, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  QrCode,
  Database,
  Search,
  AlertCircle
} from 'lucide-react';

const features = [
  { icon: FileCheck, title: 'Sellado Criptográfico', description: 'Cada factura recibe un sello único e inmutable.' },
  { icon: QrCode, title: 'Código QR de Trazabilidad', description: 'Verificación instantánea mediante código QR.' },
  { icon: Database, title: 'Registro Inmutable', description: 'Almacenamiento seguro con registro de auditoría completo.' },
  { icon: Lock, title: 'Cumplimiento Legal', description: 'Solución NO-VERI*FACTU conforme a normativa fiscal.' },
];

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // --- ESTADOS PARA VERIFICACIÓN PÚBLICA ---
  const [hashBusqueda, setHashBusqueda] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const handleVerify = async () => {
    if (!hashBusqueda) return;
    setCargando(true);
    setResultado(null);
    try {
      const response = await fetch(`${API_URL}/api/verificar-hash/${hashBusqueda}`);
      const data = await response.json();
      setResultado(data);
    } catch (error) {
      setResultado({ valido: false, mensaje: "Error al conectar con el servicio de verificación." });
    } finally {
      setCargando(false);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/registro-facturas');
    else navigate('/registro'); 
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Logo size="md" />
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={() => navigate('/registro-facturas')}>Ir al Panel</Button>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Iniciar Sesión</Button></Link>
                <Link to="/registro"><Button>Registrarse</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" /> Solución certificada NO-VERI*FACTU
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
            Gestiona tus facturas con <span className="text-primary">seguridad criptográfica</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            INALTERA permite emitir, sellar y registrar facturas cumpliendo con la normativa fiscal española.
          </p>
          <Button size="lg" className="btn-hover-lift px-8 py-6 text-lg" onClick={handleGetStarted}>
            Comenzar Gratis <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* --- SECCIÓN: VERIFICADOR PÚBLICO --- */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" /> Verificador de Integridad
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Cualquier usuario puede comprobar la validez de una factura introduciendo su huella digital (Hash).
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Pegue aquí el hash SHA-256 de la factura..."
                className="flex-1 bg-background border border-input rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                value={hashBusqueda}
                onChange={(e) => setHashBusqueda(e.target.value)}
              />
              <Button onClick={handleVerify} disabled={cargando}>
                {cargando ? "Buscando..." : "Verificar Factura"}
              </Button>
            </div>

            {/* Resultado de la búsqueda */}
            {resultado && (
              <div className={`mt-6 p-5 rounded-xl border animate-in fade-in slide-in-from-top-4 ${resultado.valido ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-start gap-3">
                  {resultado.valido ? <CheckCircle2 className="w-6 h-6 text-success" /> : <AlertCircle className="w-6 h-6 text-destructive" />}
                  <div>
                    <h4 className={`font-bold ${resultado.valido ? 'text-success' : 'text-destructive'}`}>
                      {resultado.mensaje}
                    </h4>
                    {resultado.valido && resultado.datos && (
                      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-foreground/80">
                        <p><span className="font-semibold">Nº Factura:</span> {resultado.datos.numero_factura}</p>
                        <p><span className="font-semibold">Fecha:</span> {new Date(resultado.datos.fecha_registro).toLocaleDateString()}</p>
                        <p><span className="font-semibold">Cliente:</span> {resultado.datos.cliente}</p>
                        <p><span className="font-semibold">Total:</span> {resultado.datos.total}€</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Resto de secciones (Features, Benefits, etc.) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="inaltera-card p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} INALTERA. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default Index;
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  FileCheck, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Lock,
  QrCode,
  Database
} from 'lucide-react';

const features = [
  {
    icon: FileCheck,
    title: 'Sellado Criptográfico',
    description: 'Cada factura recibe un sello único e inmutable que garantiza su autenticidad.',
  },
  {
    icon: QrCode,
    title: 'Código QR de Trazabilidad',
    description: 'Verificación instantánea mediante código QR integrado en cada documento.',
  },
  {
    icon: Database,
    title: 'Registro Inmutable',
    description: 'Almacenamiento seguro con registro de auditoría completo.',
  },
  {
    icon: Lock,
    title: 'Cumplimiento Legal',
    description: 'Solución NO-VERI*FACTU que cumple con la normativa fiscal española.',
  },
];

const benefits = [
  'Sin configuración compleja',
  'Integración con cualquier ERP',
  'Soporte técnico especializado',
  'Actualizaciones automáticas',
];

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/registro');
    } else {
      navigate('/registro-usuario');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/registro')}>
                  Ir al Panel
                </Button>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/registro">
                    <Button>Registrarse</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Shield className="w-4 h-4" />
              Solución certificada NO-VERI*FACTU
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
              Gestiona tus facturas con{' '}
              <span className="text-primary">seguridad criptográfica</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
              INALTERA te permite emitir, sellar y registrar facturas cumpliendo con 
              la normativa fiscal española. Sin complicaciones, sin errores.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
              <Button size="lg" className="btn-hover-lift text-lg px-8" onClick={handleGetStarted}>
                Comenzar Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Todo lo que necesitas para cumplir
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Una solución completa que maneja toda la complejidad legal y criptográfica 
              para que tú te centres en tu negocio.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="inaltera-card p-6 text-center hover:shadow-elevated transition-all duration-300"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Simplifica tu facturación con la "Caja Negra" de INALTERA
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Nuestra tecnología backend se encarga de todo el cumplimiento 
                criptográfico y legal. Tú solo emites o subes tus facturas.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/20 rounded-2xl p-8 lg:p-12">
              <div className="bg-card rounded-xl shadow-elevated p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Proceso instantáneo</p>
                    <p className="text-sm text-muted-foreground">Sellado en menos de 2 segundos</p>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">99.9%</p>
                    <p className="text-xs text-muted-foreground">Disponibilidad</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">256-bit</p>
                    <p className="text-xs text-muted-foreground">Encriptación</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Empieza hoy con 5 facturas gratis
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
            Sin tarjeta de crédito. Sin compromisos. Cancela cuando quieras.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="btn-hover-lift text-lg px-8"
            onClick={handleGetStarted}
          >
            Crear Cuenta Gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} INALTERA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

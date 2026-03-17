import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '../config';
import { Loader2, Building2, ArrowRight, ArrowRightCircle } from 'lucide-react';

const Register: React.FC = () => {
  // --- ESTADOS PASO 1 (Credenciales) ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // --- ESTADOS PASO 2 (Empresa) ---
  const [empresaData, setEmpresaData] = useState({
    razon_social: '',
    nif: '',
    direccion: '',
    web: ''
  });

  // --- CONTROL DE FLUJO ---
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth(); // Recuperamos la función login para auto-loguear
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- MANEJADOR PASO 1: REGISTRO Y AUTO-LOGIN ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Crear la cuenta
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '¡Cuenta creada con éxito!',
          description: 'Preparando tu entorno de trabajo...',
        });

        // 2. AUTO-LOGIN INVISIBLE (Para obtener el token)
        const loginFormData = new URLSearchParams();
        loginFormData.append('username', email);
        loginFormData.append('password', password);

        const loginResponse = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: loginFormData,
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            login(loginData.access_token); // Guardamos la sesión
            setStep(2); // Pasamos al paso opcional de la empresa
        } else {
            // Si el auto-login falla por algún motivo raro, le mandamos al login normal
            navigate('/login');
        }

      } else {
        toast({
          title: 'Error',
          description: data.detail || data.error || 'Error al registrar usuario',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No hay conexión con el servidor', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- MANEJADOR PASO 2: GUARDAR EMPRESA Y ENTRAR ---
  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const token = localStorage.getItem('inaltera_token');
        const response = await fetch(`${API_URL}/api/empresa`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(empresaData),
        });

        if (response.ok) {
            toast({ title: '¡Todo listo!', description: 'Datos de empresa guardados correctamente.' });
            navigate('/mi-empresa'); // Al Dashboard directamente
        } else {
            toast({ title: 'Aviso', description: 'No se pudieron guardar los datos. Podrás hacerlo luego en Ajustes.', variant: 'destructive' });
            navigate('/mi-empresa'); // Al Dashboard aunque falle, no lo bloqueamos
        }
    } catch (error) {
        console.error(error);
        navigate('/mi-empresa '); // Al Dashboard si hay error de red
    } finally {
        setIsLoading(false);
    }
  };

  // --- SALTAR PASO 2 Y ENTRAR ---
  const handleSkip = () => {
      navigate('/mi-empresa'); // Lo mandamos al panel principal (Dashboard) directamente
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6"><Logo size="md" /></header>
      <main className="flex-1 flex items-center justify-center p-6">
        
        {/* --- UI DEL PASO 1 (Credenciales) --- */}
        {step === 1 && (
            <div className="auth-card animate-fade-in w-full max-w-md">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">Crear Cuenta</h1>
                <p className="text-muted-foreground mt-2">Empieza a certificar tus facturas hoy mismo.</p>
              </div>
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Contraseña</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full btn-hover-lift" disabled={isLoading} size="lg">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <Link to="/login" className="text-primary hover:underline text-sm font-medium">¿Ya tienes cuenta? Inicia sesión</Link>
              </div>
            </div>
        )}

        {/* --- UI DEL PASO 2 (Opcional: Empresa) --- */}
        {step === 2 && (
             <div className="auth-card animate-in slide-in-from-right-8 fade-in duration-500 w-full max-w-md border-primary/20 shadow-xl shadow-primary/5">
                <div className="text-center mb-6">
                    <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Datos de tu Empresa</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Configura tu información fiscal. Estos datos aparecerán por defecto en tus facturas. <strong className="text-foreground">Es opcional y puedes hacerlo más tarde.</strong>
                    </p>
                </div>

                <form onSubmit={handleEmpresaSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Razón Social / Nombre</Label>
                        <Input 
                            placeholder="Ej: Mi Empresa S.L." 
                            value={empresaData.razon_social} 
                            onChange={e => setEmpresaData({...empresaData, razon_social: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>NIF / CIF</Label>
                        <Input 
                            placeholder="Ej: B12345678" 
                            value={empresaData.nif} 
                            onChange={e => setEmpresaData({...empresaData, nif: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Dirección Fiscal</Label>
                        <Input 
                            placeholder="Ej: Calle Principal 1, Madrid" 
                            value={empresaData.direccion} 
                            onChange={e => setEmpresaData({...empresaData, direccion: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Página Web (Opcional)</Label>
                        <Input 
                            placeholder="Ej: www.miempresa.com" 
                            value={empresaData.web} 
                            onChange={e => setEmpresaData({...empresaData, web: e.target.value})} 
                        />
                    </div>

                    <div className="pt-4 space-y-3 flex flex-col">
                        <Button type="submit" disabled={isLoading} className="w-full btn-hover-lift">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightCircle className="w-4 h-4 mr-2" />}
                            Guardar y Entrar al Panel
                        </Button>
                        
                        <Button type="button" variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full text-muted-foreground hover:text-foreground">
                            Omitir este paso por ahora <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </form>
             </div>
        )}

      </main>
    </div>
  );
};

export default Register;
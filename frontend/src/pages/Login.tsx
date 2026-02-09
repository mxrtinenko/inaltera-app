import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { API_URL } from '../config';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Por favor, introduce tus credenciales',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // CONEXIÓN REAL AL BACKEND
      // FastAPI espera los datos como "form data", no como JSON puro en este endpoint estándar
      const formData = new FormData();
      formData.append('username', email); // FastAPI usa 'username' por defecto
      formData.append('password', password);

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error || !response.ok) {
        toast({
          title: 'Error de acceso',
          description: 'Email o contraseña incorrectos',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Si todo va bien, guardamos el token
      login(data.access_token);
      
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente',
      });
      
      // REDIRECCIÓN INTELIGENTE
      // Ahora sí vamos al Dashboard o Registro porque ya eres un usuario real
      navigate('/perfil'); 

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error de conexión',
        description: 'No se puede conectar con el servidor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link to="/">
          <Logo size="md" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card animate-fade-in w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-muted-foreground">
              Accede a tu cuenta de INALTERA
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 inaltera-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  to="/recuperar-password"
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 inaltera-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-hover-lift"
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link
                to="/registro"
                className="text-primary hover:underline font-medium"
              >
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
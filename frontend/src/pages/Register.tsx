import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import { API_URL } from '../config';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const { login } = useAuth(); // Ya no logueamos automáticamente, obligamos a ir al login
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    try {
      // CONEXIÓN REAL AL BACKEND
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '¡Cuenta creada!',
          description: 'Usuario registrado correctamente. Ahora inicia sesión.',
        });
        navigate('/login'); // Redirigir al Login para obtener el token real
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error al registrar usuario',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No hay conexión con el servidor', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6"><Logo size="md" /></header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="auth-card animate-fade-in w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Crear Cuenta</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Contraseña</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary hover:underline">¿Ya tienes cuenta? Inicia sesión</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
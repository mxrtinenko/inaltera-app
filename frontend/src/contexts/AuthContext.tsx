import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // <--- NUEVO
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // <--- NUEVO: Empezamos cargando

  // Función auxiliar para leer el Token JWT
  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Al cargar la página, comprobamos si hay token guardado
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('inaltera_token');
      if (token) {
        const decoded = decodeToken(token);
        // Opcional: Podrías comprobar aquí si el token ha expirado (exp)
        if (decoded && decoded.sub) {
          setUser({ email: decoded.sub });
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('inaltera_token');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false); // <--- IMPORTANTE: Ya hemos terminado de comprobar
    };

    checkAuth();
  }, []);

  const login = (token: string) => {
    localStorage.setItem('inaltera_token', token);
    const decoded = decodeToken(token);
    if (decoded && decoded.sub) {
      setUser({ email: decoded.sub });
    }
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('inaltera_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {/* Si está cargando, NO renderizamos los hijos todavía para evitar redirecciones erróneas */}
      {isLoading ? null : children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
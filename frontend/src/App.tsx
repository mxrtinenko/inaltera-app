import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // Añadido Navigate
import { AuthProvider } from "@/contexts/AuthContext";

// Importaciones de Páginas
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./components/AppLayout";
// Dashboard y Perfil ya no se cargan como rutas directas, sino dentro de MiEmpresa
import Facturacion from "./pages/Facturacion";
import Registro from "./pages/Registro";
import NotFound from "./pages/NotFound";
import Verificar from "./pages/Verificar";
import Bitacora from "./pages/Bitacora";
import Catalogos from "./pages/Catalogos";
import MiEmpresa from "./pages/Miempresa"; // <--- NUEVA PÁGINA

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* --- RUTAS PÚBLICAS --- */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/verificar" element={<Verificar />} />
            
            {/* --- RUTAS PROTEGIDAS --- */}
            <Route element={<AppLayout />}>
              
              {/* 1. La nueva ruta principal */}
              <Route path="/mi-empresa" element={<MiEmpresa />} />
              
              {/* Redirecciones para que no fallen los links antiguos si quedase alguno */}
              <Route path="/dashboard" element={<Navigate to="/mi-empresa" replace />} />
              <Route path="/perfil" element={<Navigate to="/mi-empresa" replace />} />

              {/* Resto de rutas */}
              <Route path="/facturacion" element={<Facturacion />} />
              <Route path="/registro-facturas" element={<Registro />} />
              <Route path="/bitacora" element={<Bitacora />} />
              <Route path="/catalogos" element={<Catalogos />} />
            </Route>
            
            {/* Ruta por defecto */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
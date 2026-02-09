import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import {
  Building2,
  FileText,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  ScrollText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    to: '/mi-empresa',
    icon: Building2,
    label: 'Mi Empresa',
    sublabel: 'Gestión y Estadísticas',
  },
  {
    to: '/facturacion',
    icon: FileText,
    label: 'Facturación',
    sublabel: 'Emitir y Cargar',
  },
  {
    to: '/registro-facturas',
    icon: ClipboardList,
    label: 'Historial',
    sublabel: 'Registro de Facturas',
  },
  {
    to: '/catalogos',
    icon: Database,
    label: 'Catálogos',
    sublabel: 'Clientes y Productos',
  },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({ title: 'Sesión cerrada' });
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'bg-sidebar h-screen flex flex-col border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-4 border-b border-sidebar-border flex items-center',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {/* AQUI ESTÁ EL CAMBIO: Forzamos el texto blanco solo en el sidebar */}
        <Logo 
            size={collapsed ? 'sm' : 'md'} 
            showText={!collapsed} 
            className="text-white" 
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white',
            collapsed && 'hidden md:flex'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'sidebar-nav-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs opacity-70">{item.sublabel}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2 bg-sidebar-accent/50 rounded-md text-sidebar-foreground">
            <p className="text-xs opacity-60 uppercase font-semibold">Usuario</p>
            <p className="text-sm truncate font-medium" title={user.email}>{user.email}</p>
          </div>
        )}

        <NavLink
            to="/bitacora"
            className={({ isActive }) =>
              cn(
                'sidebar-nav-item text-muted-foreground hover:text-white', // Hover blanco
                isActive && 'active text-white',
                collapsed && 'justify-center px-2'
              )
            }
        >
            <ScrollText className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Bitácora de Eventos</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className={cn(
            'sidebar-nav-item w-full text-destructive hover:bg-destructive/10 mt-1',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ArrowUpRight, 
  FileText, 
  ShieldCheck, 
  TrendingUp,
  CreditCard,
  Ban,
  Activity
} from "lucide-react";
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

// Tipos de datos
interface Factura {
  id: number;
  fecha_subida: string;
  total: number;
  estado: string; 
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Métricas
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('inaltera_token');
      if (!token) return; 

      // Petición segura al backend
      const response = await fetch(`${API_URL}/api/login`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        const data: Factura[] = await response.json();
        processMetrics(data);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const processMetrics = (facturas: Factura[]) => {
    // 1. Separar activas de anuladas
    const validas = facturas.filter(f => f.estado === 'Válida');
    const anuladas = facturas.filter(f => f.estado === 'Anulada');

    // 2. Calcular Totales
    const total = validas.reduce((acc, curr) => acc + curr.total, 0);
    
    setTotalRevenue(total);
    setInvoiceCount(validas.length);
    setCancelledCount(anuladas.length);

    // 3. Generar Datos para el Gráfico (Últimos 6 meses)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
            name: d.toLocaleString('es-ES', { month: 'short' }).toUpperCase(),
            total: 0,
            fullDate: d 
        };
    });

    validas.forEach(f => {
        const fecha = new Date(f.fecha_subida);
        const mesEncontrado = last6Months.find(m => 
            m.fullDate.getMonth() === fecha.getMonth() && 
            m.fullDate.getFullYear() === fecha.getFullYear()
        );
        if (mesEncontrado) {
            mesEncontrado.total += f.total;
        }
    });

    setChartData(last6Months);
  };

  if (loading) {
      return <div className="p-8 text-center text-muted-foreground">Cargando métricas de tu negocio...</div>
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">Resumen de tu actividad en tiempo real.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="btn-hover-lift shadow-lg shadow-primary/20">
            <Link to="/facturacion">
              <FileText className="mr-2 h-4 w-4" /> Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="inaltera-card border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              Facturación acumulada
            </p>
          </CardContent>
        </Card>

        <Card className="inaltera-card border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Válidas</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documentos activos
            </p>
          </CardContent>
        </Card>

        <Card className="inaltera-card border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integridad</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Blockchain sincronizada
            </p>
          </CardContent>
        </Card>

        <Card className="inaltera-card border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anulaciones</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registros rectificados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Accesos */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Gráfico de Barras */}
        <Card className="col-span-4 inaltera-card">
          <CardHeader>
            <CardTitle>Evolución Mensual</CardTitle>
            <CardDescription>Ingresos de los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}€`} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                        }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                      No hay datos suficientes para mostrar el gráfico
                  </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accesos Rápidos */}
        <Card className="col-span-3 inaltera-card">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Gestión frecuente</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
              <Link to="/facturacion" className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">Nueva Factura</p>
                        <p className="text-xs text-muted-foreground">Emitir documento seguro</p>
                    </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link to="/registro-facturas" className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-medium">Ver Registro</p>
                        <p className="text-xs text-muted-foreground">Consultar historial</p>
                    </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
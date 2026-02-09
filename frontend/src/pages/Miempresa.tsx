import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Building2, CreditCard, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Importamos componentes existentes
import Dashboard from './Dashboard';
import Perfil from './Perfil';

const MiEmpresa = () => {
  const [usoPlan, setUsoPlan] = useState({ plan: "Cargando...", consumo: 0, limite: 100, porcentaje: 0, reset_date: "-" });

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
      const token = localStorage.getItem('inaltera_token');
      if(!token) return;
      try {
        const res = await fetch(`${API_URL}/api/uso-plan`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(res.ok) setUsoPlan(await res.json());
      } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Empresa</h1>
        <p className="text-muted-foreground">Visión general, configuración y suscripción.</p>
      </div>

      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="resumen" className="gap-2"><LayoutDashboard className="w-4 h-4"/> Resumen</TabsTrigger>
          <TabsTrigger value="datos" className="gap-2"><Building2 className="w-4 h-4"/> Datos</TabsTrigger>
          <TabsTrigger value="plan" className="gap-2"><CreditCard className="w-4 h-4"/> Mi Plan</TabsTrigger>
        </TabsList>

        {/* Pestaña 1: Dashboard */}
        <TabsContent value="resumen" className="space-y-4">
            <Dashboard />
        </TabsContent>

        {/* Pestaña 2: Perfil */}
        <TabsContent value="datos" className="space-y-4">
            <Perfil />
        </TabsContent>

        {/* Pestaña 3: SUSCRIPCIÓN (NUEVA) */}
        <TabsContent value="plan" className="space-y-4">
            <Card className="inaltera-card border-blue-100 dark:border-blue-900">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                Plan Actual: <Badge className="text-lg px-3 bg-blue-600 hover:bg-blue-700">{usoPlan.plan}</Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Tu ciclo de facturación se renueva el {usoPlan.reset_date}
                            </CardDescription>
                        </div>
                        {/* Botón "fake" para el futuro */}
                        <Button variant="outline" disabled>Gestionar en Stripe (Próximamente)</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Contador Visual */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Facturas emitidas este mes</span>
                            <span className={usoPlan.porcentaje > 90 ? "text-red-500" : "text-muted-foreground"}>
                                {usoPlan.consumo} / {usoPlan.limite}
                            </span>
                        </div>
                        <Progress value={usoPlan.porcentaje} className="h-4" />
                        <p className="text-xs text-muted-foreground text-right">
                            Has consumido el {usoPlan.porcentaje}% de tu límite mensual.
                        </p>
                    </div>

                    {/* Tabla de características (Visual) */}
                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                            <h4 className="font-semibold text-sm">Nivel Free (Actual)</h4>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> Hasta 5 facturas/mes</li>
                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> QR Verifactu</li>
                                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> Custodia 1 año</li>
                            </ul>
                        </div>
                         <div className="p-4 rounded-lg border border-dashed space-y-2 opacity-60">
                            <h4 className="font-semibold text-sm">Nivel Basic (9€)</h4>
                             <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>Hasta 20 facturas/mes</li>
                                <li>Soporte Email</li>
                            </ul>
                        </div>
                        <div className="p-4 rounded-lg border border-dashed space-y-2 opacity-60">
                            <h4 className="font-semibold text-sm">Nivel Pro (15€)</h4>
                             <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>Ilimitadas</li>
                                <li>API Access</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MiEmpresa;
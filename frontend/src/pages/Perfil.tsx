import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, CreditCard, Check, ArrowRight, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext'; // Importamos para saber si estamos logueados
import { API_URL } from '../config';

const pricingPlans = [
  {
    id: 'free',
    name: 'Gratuito',
    price: '0€',
    period: '/mes',
    invoices: '0-5 facturas',
    features: ['5 facturas selladas', 'Soporte por email', 'Registro básico'],
    current: true,
  },
  {
    id: 'basic',
    name: 'Básico',
    price: '9€',
    period: '/mes',
    invoices: '6-10 facturas',
    features: ['10 facturas selladas', 'Soporte prioritario', 'Registro avanzado', 'Exportación XML'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Profesional',
    price: '15€',
    period: '/mes',
    invoices: '11-20 facturas',
    features: ['20 facturas selladas', 'Soporte 24/7', 'API acceso', 'Integraciones', 'Multi-usuario'],
  },
];

const Perfil: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [companyData, setCompanyData] = useState({
    razon_social: '',
    nif: '',
    direccion: '', 
    web: ''        
  });
  
  const [invoiceCount, setInvoiceCount] = useState(0); 

  // Función auxiliar para obtener cabeceras con el Token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('inaltera_token');
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` // <--- AQUÍ ESTÁ LA LLAVE
    };
  };

  useEffect(() => {
    cargarDatosEmpresa();
    cargarContadorFacturas();
  }, []);

  const cargarDatosEmpresa = async () => {
    try {
      // Usamos getAuthHeaders() para enviar el token
      const res = await fetch(`${API_URL}/api/empresa`, {
        headers: getAuthHeaders() 
      });
      
      if (res.ok) {
        const data = await res.json();
        setCompanyData({
            razon_social: data.razon_social || '',
            nif: data.nif || '',
            direccion: data.direccion || '',
            web: data.web || ''
        });
      }
    } catch (error) {
      console.error("Error cargando perfil", error);
    }
  };

  const cargarContadorFacturas = async () => {
    try {
      // Aquí también, por si acaso protegemos este endpoint en el futuro
      const res = await fetch(`${API_URL}/api/registros`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceCount(data.length); 
      }
    } catch (error) {
      console.error("Error contando facturas", error);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/empresa`, {
        method: "POST",
        headers: getAuthHeaders(), // <--- Enviamos la llave al guardar
        body: JSON.stringify(companyData)
      });

      if (response.ok) {
        toast({
          title: 'Datos guardados',
          description: 'La información fiscal se ha actualizado correctamente.',
        });
      } else {
        // Si el token ha caducado o es inválido
        if (response.status === 401) {
            throw new Error("Sesión caducada. Por favor, haz login de nuevo.");
        }
        throw new Error("Error en servidor");
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los datos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = (planId: string) => {
    toast({
      title: 'Funcionalidad Demo',
      description: `En un entorno real, aquí irías a la pasarela de pago.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Datos de la Empresa y Tarifas</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu perfil empresarial y suscripción</p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="w-4 h-4" />
            Datos de la Empresa
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Tarifas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-6">
          <Card className="inaltera-card">
            <CardHeader>
              <CardTitle>Información Fiscal</CardTitle>
              <CardDescription>
                Estos datos aparecerán automáticamente en las facturas que generes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="razon_social">Razón Social</Label>
                    <Input
                      id="razon_social"
                      placeholder="Nombre de la empresa S.L."
                      value={companyData.razon_social}
                      onChange={(e) => setCompanyData({ ...companyData, razon_social: e.target.value })}
                      className="inaltera-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nif">NIF/CIF</Label>
                    <Input
                      id="nif"
                      placeholder="B12345678"
                      value={companyData.nif}
                      onChange={(e) => setCompanyData({ ...companyData, nif: e.target.value })}
                      className="inaltera-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="direccion">Domicilio Fiscal</Label>
                  <Input
                    id="direccion"
                    placeholder="Calle, número, código postal, ciudad"
                    value={companyData.direccion}
                    onChange={(e) => setCompanyData({ ...companyData, direccion: e.target.value })}
                    className="inaltera-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="web">Sitio Web (Opcional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        id="web"
                        placeholder="www.tuempresa.com"
                        value={companyData.web}
                        onChange={(e) => setCompanyData({ ...companyData, web: e.target.value })}
                        className="inaltera-input pl-9"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="btn-hover-lift">
                  {isLoading ? 'Guardando...' : 'Guardar Datos'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarifas" className="space-y-6">
          <Card className="inaltera-card bg-accent/50">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-muted-foreground">Facturas registradas</p>
                <p className="text-2xl font-bold text-foreground">{invoiceCount} de 5 (Plan Gratuito)</p>
              </div>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${invoiceCount > 5 ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min((invoiceCount / 5) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`inaltera-card relative transition-all duration-300 hover:shadow-elevated ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.invoices}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full btn-hover-lift ${plan.current ? '' : ''}`}
                    variant={plan.current ? 'outline' : 'default'}
                    disabled={plan.current}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {plan.current ? 'Plan Actual' : (
                      <>
                        Suscribirse <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Perfil;
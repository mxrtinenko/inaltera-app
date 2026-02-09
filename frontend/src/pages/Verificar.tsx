import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { API_URL } from '../config';

const Verificar = () => {
  const [searchParams] = useSearchParams();
  const hash = searchParams.get('h');
  
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    if (hash) {
      verificarHash(hash);
    } else {
      setLoading(false);
    }
  }, [hash]);

  const verificarHash = async (hashStr: string) => {
    try {
      const res = await fetch(`${API_URL}/api/verificar-hash/${hashStr}`);
      const data = await res.json();
      setResultado(data);
    } catch (error) {
      console.error(error);
      setResultado({ valido: false, mensaje: "Error de conexión con el servidor de validación." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <CardTitle>Verificación de Integridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Verificando huella digital en la cadena...</p>
            </div>
          ) : !hash ? (
            <div className="text-center py-6">
               <p className="text-muted-foreground mb-4">No se ha proporcionado ningún hash para verificar.</p>
               <Button variant="outline" asChild><Link to="/">Volver al inicio</Link></Button>
            </div>
          ) : resultado?.valido ? (
            // --- RESULTADO POSITIVO ---
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-700 mb-1">DOCUMENTO AUTÉNTICO</h2>
              <p className="text-sm text-green-600/80 mb-6">El documento está registrado y no ha sido alterado.</p>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Factura:</span>
                    <span className="font-medium">{resultado.datos.numero_factura}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Registro:</span>
                    <span className="font-medium">{new Date(resultado.datos.fecha_registro).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{resultado.datos.cliente}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Importe Total:</span>
                    <span className="font-medium">{resultado.datos.total.toFixed(2)} €</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-muted-foreground break-all">
                      Hash: {hash}
                  </p>
              </div>
            </div>
          ) : (
            // --- RESULTADO NEGATIVO ---
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-700 mb-1">VALIDACIÓN FALLIDA</h2>
              <p className="text-sm text-red-600/80 mb-6">{resultado?.mensaje}</p>
              <p className="text-xs text-muted-foreground">
                  Este documento no consta en nuestros registros o ha sido modificado.
              </p>
            </div>
          )}

          {!loading && (
             <div className="text-center pt-4">
                <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Acceso para Empresas
                </Link>
             </div>
          )}
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground">
        Sistema de Verificación No-Veri*Factu v1.0
      </p>
    </div>
  );
};

export default Verificar;
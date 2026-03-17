import React, { useState, useCallback, useEffect } from 'react';
import { API_URL } from '../config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  FileCheck, 
  Loader2,
  CloudUpload,
  File,
  PenLine,   // <--- ICONO PARA MODO MANUAL
  BookText   // <--- ICONO PARA MODO CATÁLOGO
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator 
} from '@/components/ui/select';

// --- TIPOS DE DATOS REALES ---
interface Cliente {
  id: number;
  nombre: string;
  nif: string;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  iva_por_defecto: number;
}

interface InvoiceLine {
  id: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  iva: number;
  isManual: boolean; 
}

const Facturacion: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // --- ESTADOS PARA DATOS REALES (Elaborar Factura) ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // --- ESTADOS PARA MODO MANUAL ---
  const [isManualClient, setIsManualClient] = useState(false);
  const [manualClientData, setManualClientData] = useState({ nombre: '', nif: '' });

  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    { id: '1', producto: '', cantidad: 1, precioUnitario: 0, iva: 21, isManual: false },
  ]);
  const [notas, setNotas] = useState('');
  const [lastHash, setLastHash] = useState<string | null>(null);

  // --- ESTADOS PARA SUBIDA PDF (Cargar Factura) ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    numero: '',
    cliente: '',
    total: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // --- CARGAR DATOS DE LA BASE DE DATOS AL ENTRAR ---
  useEffect(() => {
    const fetchCatalogos = async () => {
        const token = localStorage.getItem('inaltera_token');
        if (!token) return;

        try {
            const resCli = await fetch(`${API_URL}/api/clientes`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resCli.ok) setClientes(await resCli.json());

            const resProd = await fetch(`${API_URL}/api/productos`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (resProd.ok) setProductos(await resProd.json());

        } catch (error) {
            console.error("Error cargando catálogos", error);
        }
    };
    fetchCatalogos();
  }, []);

  const addLine = () => {
    setInvoiceLines([
      ...invoiceLines,
      { id: Date.now().toString(), producto: '', cantidad: 1, precioUnitario: 0, iva: 21, isManual: false },
    ]);
  };

  const removeLine = (id: string) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines(invoiceLines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setInvoiceLines(
      invoiceLines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const toggleLineManualMode = (id: string) => {
    setInvoiceLines(
      invoiceLines.map((line) =>
        line.id === id ? { ...line, isManual: !line.isManual, producto: '' } : line
      )
    );
  };

  // --- LÓGICA DE AUTOCOMPLETADO DE PRODUCTOS ---
  const handleProductChange = (lineId: string, productId: string) => {
    if (productId === "ADD_NEW_PRODUCT_ACTION") {
        navigate('/catalogos', { state: { defaultTab: 'productos' } });
        return;
    }

    const productoCatalogo = productos.find(p => p.id.toString() === productId);
    
    if (productoCatalogo) {
        setInvoiceLines(invoiceLines.map(line => 
            line.id === lineId 
            ? { 
                ...line, 
                producto: productoCatalogo.nombre, 
                precioUnitario: productoCatalogo.precio,
                iva: productoCatalogo.iva_por_defecto
              } 
            : line
        ));
    }
  };

  const handleClientSelectChange = (value: string) => {
      if (value === "ADD_NEW_CLIENT_ACTION") {
          navigate('/catalogos', { state: { defaultTab: 'clientes' } });
      } else {
          setSelectedClienteId(value);
      }
  };

  const getProductIdByName = (name: string) => {
      const prod = productos.find(p => p.nombre === name);
      return prod ? prod.id.toString() : "";
  }

  const calculateTotal = () => {
    return invoiceLines.reduce((acc, line) => {
      const base = line.cantidad * line.precioUnitario;
      const ivaAmount = base * (line.iva / 100);
      return acc + base + ivaAmount;
    }, 0);
  };

  // --- FUNCIÓN DE EMISIÓN (ACTUALIZADA PARA DATOS MANUALES) ---
  const handleGenerateInvoice = async () => {
    if (!isManualClient && !selectedClienteId) {
      toast({ title: 'Error', description: 'Selecciona un cliente del catálogo o introdúcelo manualmente', variant: 'destructive' });
      return;
    }
    if (isManualClient && (!manualClientData.nombre || !manualClientData.nif)) {
      toast({ title: 'Error', description: 'Rellena el nombre y el NIF del cliente manual', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('inaltera_token');
      if (!token) throw new Error("Sesión expirada. Por favor haz login de nuevo.");

      let payloadNombre = "";
      let payloadNif = "";

      if (isManualClient) {
        payloadNombre = manualClientData.nombre;
        payloadNif = manualClientData.nif;
      } else {
        const clienteObj = clientes.find(c => c.id.toString() === selectedClienteId);
        payloadNombre = clienteObj ? clienteObj.nombre : "Cliente Desconocido";
        payloadNif = clienteObj ? clienteObj.nif : "00000000T";
      }
      
      const payload = {
        cliente_nombre: payloadNombre,
        cliente_nif: payloadNif,
        items: invoiceLines.map(line => ({
          producto: line.producto || "Producto genérico", 
          cantidad: line.cantidad,
          precio_unitario: line.precioUnitario,
          iva: line.iva
        })),
        notas: notas
      };

      const response = await fetch(`${API_URL}/api/emitir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '¡Factura Generada!',
          description: `Se ha creado y sellado la factura. Hash: ${data.datos_trazabilidad.hash.substring(0, 10)}...`,
        });
        
        setLastHash(data.datos_trazabilidad.hash);
        setInvoiceLines([{ id: Date.now().toString(), producto: '', cantidad: 1, precioUnitario: 0, iva: 21, isManual: false }]);
        setNotas('');
        if (isManualClient) {
            setManualClientData({ nombre: '', nif: '' });
        }
      } else {
        throw new Error(data.detail || "Error en el servidor");
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo conectar con el generador.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNCIÓN DE SUBIDA PDF ---
  const handleUploadPdf = async () => {
    if (!uploadedFile) {
        toast({ title: 'Error', description: 'Debes seleccionar un archivo PDF.', variant: 'destructive' });
        return;
    }
    if (!uploadFormData.numero || !uploadFormData.cliente || !uploadFormData.total) {
        toast({ title: 'Datos incompletos', description: 'Rellena el número, cliente y total.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('inaltera_token');
      if (!token) throw new Error("Sesión expirada.");

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("numero", uploadFormData.numero);
      formData.append("cliente", uploadFormData.cliente);
      formData.append("total", uploadFormData.total);
      formData.append("fecha", uploadFormData.fecha);

      const response = await fetch(`${API_URL}/api/subir-factura`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        toast({
          title: '¡PDF procesado y Sellado!',
          description: `Factura legalizada y guardada en el historial.`,
        });
        
        setUploadedFile(null); 
        setUploadFormData({ numero: '', cliente: '', total: '', fecha: new Date().toISOString().split('T')[0] });
        setLastHash(null);
        navigate('/registro-facturas');

      } else {
        const errData = await response.json();
        throw new Error(errData.detail || "El servidor devolvió un error");
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo procesar el archivo.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setUploadedFile(files[0]);
    } else {
      toast({ title: 'Error', description: 'Solo PDF', variant: 'destructive' });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      setUploadedFile(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Facturación y Carga</h1>
        <p className="text-muted-foreground mt-1">Crea facturas o sube PDFs para sellarlos</p>
      </div>

      <Tabs defaultValue="elaborar" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="elaborar" className="gap-2">
            <FileText className="w-4 h-4" />
            Elaborar Factura
          </TabsTrigger>
          <TabsTrigger value="cargar" className="gap-2">
            <Upload className="w-4 h-4" />
            Cargar PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elaborar" className="space-y-6">
          <Card className="inaltera-card">
            <CardHeader>
              <CardTitle>Nueva Factura</CardTitle>
              <CardDescription>
                Completa los datos para generar y sellar una nueva factura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* --- SECCIÓN CLIENTE --- */}
              <div className="space-y-2 bg-muted/20 p-4 rounded-lg border">
                <Label className="text-base font-semibold block mb-2">Datos del Cliente</Label>
                
                <div className="flex gap-3 items-start">
                  <Button 
                      type="button"
                      variant="outline" 
                      size="icon" 
                      className="shrink-0"
                      onClick={() => setIsManualClient(!isManualClient)}
                      title={isManualClient ? "Elegir del catálogo" : "Escribir manualmente"}
                  >
                      {isManualClient ? <BookText className="w-4 h-4 text-primary" /> : <PenLine className="w-4 h-4 text-primary" />}
                  </Button>

                  <div className="flex-1">
                    {isManualClient ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Nombre / Razón Social</Label>
                                <Input 
                                    placeholder="Ej: Juan Pérez" 
                                    value={manualClientData.nombre}
                                    onChange={(e) => setManualClientData({...manualClientData, nombre: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">NIF / CIF</Label>
                                <Input 
                                    placeholder="Ej: 12345678Z" 
                                    value={manualClientData.nif}
                                    onChange={(e) => setManualClientData({...manualClientData, nif: e.target.value})}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <Select value={selectedClienteId} onValueChange={handleClientSelectChange}>
                              <SelectTrigger className="inaltera-input">
                                <SelectValue placeholder="Selecciona un cliente de tu catálogo" />
                              </SelectTrigger>
                              <SelectContent>
                                {clientes.length === 0 ? (
                                    <SelectItem value="none" disabled>No hay clientes registrados</SelectItem>
                                ) : (
                                    clientes.map((cliente) => (
                                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                        {cliente.nombre} ({cliente.nif})
                                    </SelectItem>
                                    ))
                                )}
                                <SelectSeparator />
                                <SelectItem value="ADD_NEW_CLIENT_ACTION" className="text-primary font-medium cursor-pointer bg-primary/5 hover:bg-primary/10">
                                    <span className="flex items-center gap-2"><Plus className="w-4 h-4"/> Añadir al catálogo para el futuro...</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- SECCIÓN LÍNEAS DE FACTURA --- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Líneas de Factura</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="w-4 h-4 mr-1" /> Añadir línea
                  </Button>
                </div>

                <div className="space-y-3">
                  {invoiceLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-muted/30 rounded-lg border border-border/50">
                      
                      <div className="col-span-12 md:col-span-4 space-y-1">
                        <Label className="text-xs">Producto/Servicio</Label>
                        
                        <div className="flex gap-2">
                          <Button 
                              type="button"
                              variant="outline" 
                              size="icon" 
                              className="shrink-0 h-9 w-9"
                              onClick={() => toggleLineManualMode(line.id)}
                              title={line.isManual ? "Elegir del catálogo" : "Escribir manualmente"}
                          >
                              {line.isManual ? <BookText className="w-4 h-4 text-primary" /> : <PenLine className="w-4 h-4 text-primary" />}
                          </Button>

                          <div className="flex-1">
                            {line.isManual ? (
                                <Input 
                                    placeholder="Ej: Consultoría web"
                                    value={line.producto}
                                    onChange={(e) => updateLine(line.id, 'producto', e.target.value)}
                                    className="h-9"
                                />
                            ) : (
                                <Select 
                                    value={getProductIdByName(line.producto)} 
                                    onValueChange={(val) => handleProductChange(line.id, val)}
                                >
                                    <SelectTrigger className="inaltera-input h-9">
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productos.length === 0 ? (
                                            <SelectItem value="none" disabled>No hay productos</SelectItem>
                                        ) : (
                                            productos.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.nombre}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={line.cantidad}
                          onChange={(e) => updateLine(line.id, 'cantidad', parseInt(e.target.value) || 1)}
                          className="inaltera-input h-9"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-xs">Precio (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.precioUnitario}
                          onChange={(e) => updateLine(line.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="inaltera-input h-9"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <Label className="text-xs">IVA (%)</Label>
                        <Select 
                          value={line.iva.toString()}
                          onValueChange={(val) => updateLine(line.id, 'iva', parseInt(val))}
                        >
                          <SelectTrigger className="inaltera-input h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="4">4%</SelectItem>
                            <SelectItem value="0">0%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          disabled={invoiceLines.length === 1}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Observaciones adicionales para la factura..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="inaltera-input resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total (IVA incluido)</p>
                  <p className="text-3xl font-bold text-foreground">{calculateTotal().toFixed(2)} €</p>
                </div>
                <Button 
                  onClick={handleGenerateInvoice} 
                  disabled={isLoading}
                  className="btn-hover-lift"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 mr-2" />
                      Generar y Sellar Factura
                    </>
                  )}
                </Button>
              </div>

              {lastHash && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between animate-fade-in">
                  <div className="text-sm text-green-800">
                    <p className="font-bold">Factura emitida correctamente</p>
                    <p>Puedes verificar su inmutabilidad ahora mismo.</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-white text-green-700 hover:text-green-800 hover:bg-green-100 border-green-200"
                    onClick={() => window.open(`/verificar?h=${lastHash}`, '_blank')}
                  >
                    🔗 Verificar en Blockchain
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA CARGAR (SIN CAMBIOS) */}
        <TabsContent value="cargar" className="space-y-6">
          <Card className="inaltera-card">
            <CardHeader>
              <CardTitle>Cargar Factura PDF</CardTitle>
              <CardDescription>
                Sube un PDF de factura de terceros para sellarlo con código QR de trazabilidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                  ${uploadedFile ? 'bg-success/5 border-success' : ''}
                `}
              >
                {uploadedFile ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                      <File className="w-8 h-8 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setUploadedFile(null)}>Cambiar archivo</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <CloudUpload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Arrastra tu PDF aquí</p>
                      <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                      <Button variant="outline" size="sm" asChild><span>Seleccionar PDF</span></Button>
                    </label>
                  </div>
                )}
              </div>

              <div className="border-t my-2"></div>

              <div className="space-y-4">
                  <Label className="text-base font-semibold">Datos de la Factura Externa</Label>
                  <p className="text-xs text-muted-foreground -mt-3">Introduce los datos clave para generar el Hash legal.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Número de Factura</Label>
                          <Input placeholder="Ej: F-2024-EX-01" value={uploadFormData.numero} onChange={(e) => setUploadFormData({...uploadFormData, numero: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                          <Label>Fecha Emisión</Label>
                          <Input type="date" value={uploadFormData.fecha} onChange={(e) => setUploadFormData({...uploadFormData, fecha: e.target.value})} />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label>Nombre Cliente</Label>
                      <Input placeholder="Nombre del cliente..." value={uploadFormData.cliente} onChange={(e) => setUploadFormData({...uploadFormData, cliente: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                      <Label>Total Factura (€)</Label>
                      <div className="relative">
                          <Input type="number" step="0.01" placeholder="0.00" className="pl-6 font-mono font-bold" value={uploadFormData.total} onChange={(e) => setUploadFormData({...uploadFormData, total: e.target.value})} />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                  </div>
              </div>

              <Button onClick={handleUploadPdf} disabled={!uploadedFile || isLoading} className="w-full btn-hover-lift" size="lg">
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                ) : (
                  <><FileCheck className="w-4 h-4 mr-2" /> Cargar y Sellar PDF</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Facturacion;
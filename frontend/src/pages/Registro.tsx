import React, { useState, useEffect } from "react";
import { API_URL } from '../config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Ban, 
  CalendarIcon,
  XCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FacturaBackend {
  id: number;
  nombre_archivo: string;
  fecha_subida: string;
  numero_factura: string;
  cliente: string;
  total: number;
  hash_actual: string;
  estado: string;
  tipo: string;
}

interface FacturaVisual {
  id: string;
  fecha: Date;
  tipo: string;
  numero: string;
  cliente: string;
  total: number;
  estado: string;
  hash?: string;
}

const Registro: React.FC = () => {
  const { toast } = useToast();
  
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [facturas, setFacturas] = useState<FacturaVisual[]>([]);
  const [, setIsLoading] = useState(true);

  // --- 1. CARGAR DATOS ---
  const fetchFacturas = async () => {
      try {
        const token = localStorage.getItem('inaltera_token');
        if (!token) return; 

        const response = await fetch(`${API_URL}/api/registros`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data: FacturaBackend[] = await response.json();
          const facturasMapeadas: FacturaVisual[] = data.map((item) => ({
            id: item.id.toString(),
            fecha: new Date(item.fecha_subida),
            tipo: item.tipo === "Anulacion" ? "Rectificativa" : "Emitida", 
            numero: item.numero_factura || item.nombre_archivo,
            cliente: item.cliente || "General",
            total: item.total || 0.0,
            estado: item.estado, 
            hash: item.hash_actual,
          }));
          setFacturas(facturasMapeadas.reverse());
        }
      } catch (error) {
        console.error("Error conectando:", error);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  // --- 2. ANULAR ---
  const handleAnular = async (id: string) => {
    try {
        const token = localStorage.getItem('inaltera_token');
        const response = await fetch(`${API_URL}/api/anular/${id}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ motivo: "Error administrativo" })
        });

        if (response.ok) {
            toast({
                title: "Factura Anulada",
                description: "Se ha registrado el evento de anulación.",
                variant: "destructive"
            });
            fetchFacturas(); 
        }
    } catch (error) {
        toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  // --- FILTERING ---
  const filteredFacturas = facturas.filter((factura) => {
    const matchesSearch =
      searchQuery === "" ||
      factura.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      factura.cliente.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateStart) {
        const start = new Date(dateStart);
        start.setHours(0,0,0,0);
        const factDate = new Date(factura.fecha);
        factDate.setHours(0,0,0,0);
        matchesDate = matchesDate && factDate >= start;
    }
    if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(factura.fecha) <= end;
    }
    return matchesSearch && matchesDate;
  });

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredFacturas.length / itemsPerPage);
  const paginatedFacturas = filteredFacturas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // --- DOWNLOADS ---
  const downloadSecure = async (url: string, filename: string) => {
    try {
        const token = localStorage.getItem('inaltera_token');
        const response = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
        if (!response.ok) throw new Error("Error");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl); 
    } catch (e) {
        toast({ title: "Error", description: "No se pudo descargar.", variant: "destructive" });
    }
  };

  // Esta es la función que usa el botón. Llama a downloadSecure internamente.
  const handleDownloadPdf = (id: string, nombreArchivo: string) => {
    downloadSecure(`${API_URL}/api/download/${id}`, nombreArchivo);
  };

  const handleDownloadJSON = (id: string) => {
    downloadSecure(`${API_URL}/api/download-json/${id}`, `registro_${id}.json`);
  };

  // --- UI HELPERS ---
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "Válida": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Válida</Badge>;
      case "Anulada": return <Badge variant="destructive" className="opacity-80">Anulada</Badge>;
      default: return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getTypeBadge = (tipo: string) => {
      if (tipo === "Emitida") return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Emitida</Badge>
      if (tipo === "Rectificativa") return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Rectificativa</Badge>
      return <Badge variant="outline">{tipo}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registro de Facturas</h1>
        <p className="text-muted-foreground">
          Consulta y gestiona el histórico de emisiones.
        </p>
      </div>

      <Card className="inaltera-card border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            
            {/* Cabecera y Buscador */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Histórico</CardTitle>
                  <CardDescription>{filteredFacturas.length} documentos encontrados</CardDescription>
                </div>
                
                {/* Barra de Herramientas */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Buscador */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente, número..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-background"
                        />
                    </div>

                    {/* Filtros de Fecha (Más sutiles) */}
                    <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-md border">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground ml-2" />
                        <Input 
                            type="date" 
                            className="h-8 w-32 border-0 bg-transparent text-xs focus-visible:ring-0 shadow-none px-1 text-muted-foreground focus:text-foreground"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            title="Fecha Inicio"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input 
                            type="date" 
                            className="h-8 w-32 border-0 bg-transparent text-xs focus-visible:ring-0 shadow-none px-1 text-muted-foreground focus:text-foreground"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            title="Fecha Fin"
                        />
                        {(dateStart || dateEnd) && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 mr-1 hover:text-red-500 rounded-full" 
                                onClick={() => {setDateStart(""); setDateEnd("");}}
                            >
                                <XCircle className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total (€)</TableHead>
                  <TableHead className="text-center w-[120px]">Estado</TableHead>
                  <TableHead className="text-center w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFacturas.length > 0 ? (
                  paginatedFacturas.map((factura) => (
                    <TableRow key={factura.id} className={factura.estado === 'Anulada' ? 'bg-muted/20' : 'hover:bg-muted/5'}>
                      <TableCell className="text-sm text-muted-foreground font-medium">
                        {format(factura.fecha, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                          {getTypeBadge(factura.tipo)}
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${factura.estado === 'Anulada' ? 'line-through text-muted-foreground' : ''}`}>
                        {factura.numero}
                      </TableCell>
                      <TableCell className={factura.estado === 'Anulada' ? 'text-muted-foreground' : 'font-medium'}>
                        {factura.cliente}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${factura.total < 0 ? 'text-red-600' : ''} ${factura.estado === 'Anulada' ? 'text-muted-foreground line-through' : ''}`}>
                        {factura.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(factura.estado)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {factura.estado !== 'Evento de Anulación' && (
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600" 
                                // AQUÍ ESTABA EL ERROR: Ya llamamos a la función correcta directamente
                                onClick={() => handleDownloadPdf(factura.id, factura.numero)} 
                                title="Descargar PDF"
                             >
                                <FileText className="w-4 h-4" />
                             </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-purple-600" onClick={() => handleDownloadJSON(factura.id)} title="JSON Trazabilidad">
                            <FileCode className="w-4 h-4" />
                          </Button>

                          {factura.estado === 'Válida' && factura.tipo === 'Emitida' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" title="Anular Factura">
                                        <Ban className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Anular factura?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción generará un registro rectificativo negativo. La factura original quedará marcada como anulada.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAnular(factura.id)} className="bg-red-600 hover:bg-red-700">
                                            Confirmar Anulación
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No se encontraron resultados con estos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           {totalPages > 1 && (
            <div className="flex justify-end p-4 border-t gap-2">
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(c => Math.max(1, c-1))} disabled={currentPage===1}><ChevronLeft className="w-4"/></Button>
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(c => Math.min(totalPages, c+1))} disabled={currentPage===totalPages}><ChevronRight className="w-4"/></Button>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Registro;
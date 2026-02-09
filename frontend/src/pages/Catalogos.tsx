import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Package, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'react-router-dom';

interface Cliente { id: number; nombre: string; nif: string; direccion: string; email: string; }
interface Producto { id: number; nombre: string; precio: number; iva_por_defecto: number; }

const Catalogos = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("clientes");
  
  // Datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  
  // Estado para saber si estamos editando (si es null, estamos creando)
  const [editingId, setEditingId] = useState<number | null>(null);

  // Formularios
  const [newCliente, setNewCliente] = useState({ nombre: '', nif: '', direccion: '', email: '' });
  const [newProducto, setNewProducto] = useState({ nombre: '', precio: 0, iva_por_defecto: 21 });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Detectar si venimos redirigidos desde Facturación
  useEffect(() => {
    if (location.state && location.state.defaultTab) {
        setActiveTab(location.state.defaultTab);
    }
  }, [location]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('inaltera_token');
    if (!token) return;

    try {
        const resCli = await fetch(`${API_URL}/api/clientes`, { headers: { "Authorization": `Bearer ${token}` } });
        if (resCli.ok) setClientes(await resCli.json());

        const resProd = await fetch(`${API_URL}/api/productos`, { headers: { "Authorization": `Bearer ${token}` } });
        if (resProd.ok) setProductos(await resProd.json());
    } catch (e) {
        console.error("Error fetching data", e);
    }
  };

  // --- GESTIÓN DE CLIENTES ---

  const handleSaveCliente = async () => {
    const token = localStorage.getItem('inaltera_token');
    const method = editingId ? "PUT" : "POST";
    const url = editingId 
        ? `${API_URL}/api/clientes/${editingId}`
        : `${API_URL}/api/clientes`;

    const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newCliente)
    });

    if (res.ok) {
        toast({ title: editingId ? "Cliente actualizado" : "Cliente creado" });
        fetchData();
        closeDialog();
    } else {
        toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDeleteCliente = async (id: number) => {
      if(!confirm("¿Seguro que quieres borrar este cliente?")) return;
      const token = localStorage.getItem('inaltera_token');
      const res = await fetch(`${API_URL}/api/clientes/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
          toast({ title: "Cliente eliminado" });
          fetchData();
      }
  };

  // --- GESTIÓN DE PRODUCTOS ---

  const handleSaveProducto = async () => {
    const token = localStorage.getItem('inaltera_token');
    const method = editingId ? "PUT" : "POST";
    const url = editingId 
        ? `${API_URL}/api/productos/${editingId}`
        : `${API_URL}/api/productos`;

    const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newProducto)
    });

    if (res.ok) {
        toast({ title: editingId ? "Producto actualizado" : "Producto creado" });
        fetchData();
        closeDialog();
    } else {
        toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDeleteProducto = async (id: number) => {
    if(!confirm("¿Seguro que quieres borrar este producto?")) return;
    const token = localStorage.getItem('inaltera_token');
    const res = await fetch(`${API_URL}/api/productos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
        toast({ title: "Producto eliminado" });
        fetchData();
    }
};

  // --- FUNCIONES AUXILIARES DIALOG ---

  const openNewDialog = () => {
      setEditingId(null);
      setNewCliente({ nombre: '', nif: '', direccion: '', email: '' });
      setNewProducto({ nombre: '', precio: 0, iva_por_defecto: 21 });
      setIsDialogOpen(true);
  };

  const openEditCliente = (c: Cliente) => {
      setEditingId(c.id);
      setNewCliente(c);
      setIsDialogOpen(true);
  };

  const openEditProducto = (p: Producto) => {
      setEditingId(p.id);
      setNewProducto(p);
      setIsDialogOpen(true);
  };

  const closeDialog = () => {
      setIsDialogOpen(false);
      setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <p className="text-muted-foreground">Gestiona tus bases de datos de clientes y servicios.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clientes" className="gap-2"><Users className="w-4 h-4"/> Clientes</TabsTrigger>
          <TabsTrigger value="productos" className="gap-2"><Package className="w-4 h-4"/> Productos</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA CLIENTES --- */}
        <TabsContent value="clientes">
          <Card className="inaltera-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Cartera de Clientes</CardTitle><CardDescription>Clientes disponibles para facturar</CardDescription></div>
              <Dialog open={isDialogOpen && activeTab === 'clientes'} onOpenChange={(open) => !open && closeDialog()}>
                <DialogTrigger asChild>
                    <Button onClick={openNewDialog}><Plus className="w-4 h-4 mr-2"/> Nuevo Cliente</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingId ? 'Editar Cliente' : 'Añadir Cliente'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nombre / Razón Social</Label><Input value={newCliente.nombre} onChange={e => setNewCliente({...newCliente, nombre: e.target.value})} /></div>
                        <div className="space-y-2"><Label>NIF / CIF</Label><Input value={newCliente.nif} onChange={e => setNewCliente({...newCliente, nif: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Dirección</Label><Input value={newCliente.direccion} onChange={e => setNewCliente({...newCliente, direccion: e.target.value})} /></div>
                        <Button onClick={handleSaveCliente} className="w-full">{editingId ? 'Actualizar' : 'Guardar'}</Button>
                    </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>NIF</TableHead><TableHead>Dirección</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {clientes.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No hay clientes</TableCell></TableRow> : 
                        clientes.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.nombre}</TableCell>
                                <TableCell>{c.nif}</TableCell>
                                <TableCell>{c.direccion}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditCliente(c)}><Pencil className="w-4 h-4 text-blue-500"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCliente(c.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA PRODUCTOS --- */}
        <TabsContent value="productos">
          <Card className="inaltera-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Catálogo de Productos</CardTitle><CardDescription>Servicios y precios predefinidos</CardDescription></div>
              <Dialog open={isDialogOpen && activeTab === 'productos'} onOpenChange={(open) => !open && closeDialog()}>
                <DialogTrigger asChild>
                    <Button onClick={openNewDialog}><Plus className="w-4 h-4 mr-2"/> Nuevo Producto</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingId ? 'Editar Producto' : 'Añadir Producto'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Nombre del Servicio</Label><Input value={newProducto.nombre} onChange={e => setNewProducto({...newProducto, nombre: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Precio Base (€)</Label><Input type="number" value={newProducto.precio} onChange={e => setNewProducto({...newProducto, precio: parseFloat(e.target.value)})} /></div>
                            <div className="space-y-2"><Label>IVA (%)</Label>
                                <Select value={newProducto.iva_por_defecto.toString()} onValueChange={(val) => setNewProducto({...newProducto, iva_por_defecto: parseInt(val)})}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="21">21%</SelectItem><SelectItem value="10">10%</SelectItem><SelectItem value="4">4%</SelectItem><SelectItem value="0">0%</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={handleSaveProducto} className="w-full">{editingId ? 'Actualizar' : 'Guardar'}</Button>
                    </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Precio</TableHead><TableHead>IVA</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {productos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No hay productos</TableCell></TableRow> : 
                        productos.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.nombre}</TableCell>
                                <TableCell>{p.precio.toFixed(2)}€</TableCell>
                                <TableCell>{p.iva_por_defecto}%</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditProducto(p)}><Pencil className="w-4 h-4 text-blue-500"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProducto(p.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Catalogos;
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Key, FileText, AlertTriangle, Download, Settings, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface Evento {
    id: number;
    fecha: string;
    categoria: string;
    descripcion: string;
    nivel: string;
}

const Bitacora = () => {
    const [eventos, setEventos] = useState<Evento[]>([]);

    useEffect(() => {
        const fetchBitacora = async () => {
            const token = localStorage.getItem('inaltera_token');
            const res = await fetch(`${API_URL}/api/bitacora`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                setEventos(await res.json());
            }
        };
        fetchBitacora();
    }, []);

    const getIcon = (cat: string) => {
        switch(cat) {
            case 'LOGIN': return <Key className="w-4 h-4 text-blue-500" />;
            case 'FACTURACION': return <FileText className="w-4 h-4 text-green-500" />;
            case 'ANULACION': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'DESCARGA': return <Download className="w-4 h-4 text-purple-500" />;
            case 'CONFIG': return <Settings className="w-4 h-4 text-gray-500" />;
            default: return <Activity className="w-4 h-4 text-foreground" />;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Historial de Eventos</h1>
                <p className="text-muted-foreground">Registro inalterable de actividad del sistema (Req. Veri*factu).</p>
            </div>

            <Card className="inaltera-card">
                <CardHeader>
                    <CardTitle>Historial de Actividad</CardTitle>
                    <CardDescription>Eventos registrados cronológicamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] w-full pr-4">
                        <div className="space-y-4">
                            {eventos.map((evento) => (
                                <div key={evento.id} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div className="mt-1 p-2 bg-background rounded-full border border-border shadow-sm">
                                        {getIcon(evento.categoria)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-sm">{evento.categoria}</p>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(evento.fecha), "dd/MM/yyyy HH:mm:ss")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                                    </div>
                                    <div>
                                        <Badge variant={evento.nivel === 'INFO' ? 'outline' : 'destructive'}>
                                            {evento.nivel}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default Bitacora;
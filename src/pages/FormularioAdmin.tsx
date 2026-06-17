import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, FileSpreadsheet, Share2, Trash2, Pencil, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Respuesta {
  id: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  telefono: string;
  posicion_principal: string;
  posicion_alternativa: string | null;
  continuar_equipo: string;
  motivo_no_continuar: string | null;
  disponible_12_agosto: string;
  fecha_incorporacion: string | null;
  compromisos_agosto: string | null;
  observaciones: string | null;
  created_at: string;
}

const POSICIONES = [
  'Portero', 'Lateral derecho', 'Central', 'Lateral izquierdo',
  'Mediocentro defensivo', 'Mediocentro', 'Interior',
  'Extremo derecho', 'Extremo izquierdo', 'Media punta', 'Delantero',
];

const ADMIN_EMAILS = ['pinilla.22@gmail.com', 'placido.futbol2@gmail.com'];

function toCSV(rows: Respuesta[]): string {
  const headers = [
    'Fecha envío', 'Nombre completo', 'Fecha nacimiento', 'Teléfono',
    'Posición principal', 'Posición alternativa', 'Continúa', 'Motivo no continúa',
    'Disponible 12 agosto', 'Fecha incorporación', 'Compromisos agosto', 'Observaciones',
  ];
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map(r => [
    new Date(r.created_at).toLocaleString('es-ES'),
    r.nombre_completo, r.fecha_nacimiento, r.telefono,
    r.posicion_principal, r.posicion_alternativa ?? '',
    r.continuar_equipo, r.motivo_no_continuar ?? '',
    r.disponible_12_agosto, r.fecha_incorporacion ?? '',
    r.compromisos_agosto ?? '', r.observaciones ?? '',
  ].map(escape).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export default function FormularioAdmin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');
  const [rows, setRows] = useState<Respuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filterPos, setFilterPos] = useState<string>('all');
  const [filterDisp, setFilterDisp] = useState<string>('all');
  const [filterCont, setFilterCont] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [authLoading, isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('formulario_temporada_2026_2027')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Error: ' + error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (q && !r.nombre_completo.toLowerCase().includes(q.toLowerCase())) return false;
      if (filterPos !== 'all' && r.posicion_principal !== filterPos) return false;
      if (filterDisp !== 'all' && r.disponible_12_agosto !== filterDisp) return false;
      if (filterCont !== 'all' && r.continuar_equipo !== filterCont) return false;
      return true;
    });
  }, [rows, q, filterPos, filterDisp, filterCont]);

  const exportCSV = () => {
    const csv = toCSV(filtered);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulario-temporada-2026-2027-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // Excel reads CSV with .xls extension and tab separator
    const headers = [
      'Fecha envío', 'Nombre completo', 'Fecha nacimiento', 'Teléfono',
      'Posición principal', 'Posición alternativa', 'Continúa', 'Motivo no continúa',
      'Disponible 12 agosto', 'Fecha incorporación', 'Compromisos agosto', 'Observaciones',
    ];
    const lines = filtered.map(r => [
      new Date(r.created_at).toLocaleString('es-ES'),
      r.nombre_completo, r.fecha_nacimiento, r.telefono,
      r.posicion_principal, r.posicion_alternativa ?? '',
      r.continuar_equipo, r.motivo_no_continuar ?? '',
      r.disponible_12_agosto, r.fecha_incorporacion ?? '',
      r.compromisos_agosto ?? '', r.observaciones ?? '',
    ].map(v => String(v).replace(/\t|\n/g, ' ')).join('\t'));
    const tsv = [headers.join('\t'), ...lines].join('\n');
    const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulario-temporada-2026-2027-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = () => {
    const url = `${window.location.origin}/formulario`;
    const text = encodeURIComponent(
      `📋 *Formulario Temporada 2026/2027*\n\nHola, por favor rellena este breve cuestionario (menos de 3 minutos):\n${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/formulario`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('formulario_temporada_2026_2027').delete().eq('id', deleteId);
    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Respuesta eliminada');
      setRows(prev => prev.filter(r => r.id !== deleteId));
    }
    setDeleteId(null);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    const { id, created_at, ...payload } = editRow;
    const { error } = await supabase.from('formulario_temporada_2026_2027').update(payload).eq('id', id);
    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Actualizado');
      setRows(prev => prev.map(r => r.id === id ? editRow : r));
      setEditRow(null);
    }
  };

  if (authLoading || !isAdmin) return null;

  const total = rows.length;
  const continuanSi = rows.filter(r => r.continuar_equipo === 'Sí').length;
  const dispSi = rows.filter(r => r.disponible_12_agosto === 'Sí').length;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl sm:text-2xl">Respuestas — Formulario Temporada 2026/2027</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-primary">{total}</div>
          <div className="text-xs text-muted-foreground">Total respuestas</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-success">{continuanSi}</div>
          <div className="text-xs text-muted-foreground">Continúan</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <div className="text-2xl font-bold text-warning">{dispSi}</div>
          <div className="text-xs text-muted-foreground">Disp. 12 agosto</div>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-4 pb-4 flex flex-wrap gap-2">
          <Button onClick={shareWhatsApp} size="sm" variant="success">
            <Share2 className="h-4 w-4 mr-1" /> Compartir WhatsApp
          </Button>
          <Button onClick={copyLink} size="sm" variant="outline">
            Copiar enlace
          </Button>
          <Button onClick={exportCSV} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={exportExcel} size="sm" variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={q} onChange={e => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterPos} onValueChange={setFilterPos}>
            <SelectTrigger><SelectValue placeholder="Posición" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {POSICIONES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDisp} onValueChange={setFilterDisp}>
            <SelectTrigger><SelectValue placeholder="Disponibilidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Sí">Sí, disp. 12 ago</SelectItem>
              <SelectItem value="No">No, más tarde</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCont} onValueChange={setFilterCont}>
            <SelectTrigger><SelectValue placeholder="Continuidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Sí">Continúan</SelectItem>
              <SelectItem value="No">No continúan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Users className="h-10 w-10 opacity-40" />
              <p>No hay respuestas que coincidan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tel.</TableHead>
                    <TableHead>F. Nac.</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead>Alt.</TableHead>
                    <TableHead>Continúa</TableHead>
                    <TableHead>Motivo no continúa</TableHead>
                    <TableHead>12 ago</TableHead>
                    <TableHead>Incorp.</TableHead>
                    <TableHead>Compromisos</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell className="font-medium">{r.nombre_completo}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.telefono}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{r.fecha_nacimiento}</TableCell>
                      <TableCell>{r.posicion_principal}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.posicion_alternativa || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.continuar_equipo === 'Sí' ? 'default' : 'destructive'}>{r.continuar_equipo}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs whitespace-pre-wrap">{r.motivo_no_continuar || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.disponible_12_agosto === 'Sí' ? 'default' : 'secondary'}>{r.disponible_12_agosto}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.fecha_incorporacion || '—'}</TableCell>
                      <TableCell className="max-w-[200px] text-xs whitespace-pre-wrap">{r.compromisos_agosto || '—'}</TableCell>
                      <TableCell className="max-w-[200px] text-xs whitespace-pre-wrap">{r.observaciones || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => setEditRow(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar respuesta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar respuesta</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={editRow.nombre_completo} onChange={e => setEditRow({ ...editRow, nombre_completo: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={editRow.telefono} onChange={e => setEditRow({ ...editRow, telefono: e.target.value })} /></div>
              <div><Label>Fecha nacimiento</Label><Input type="date" value={editRow.fecha_nacimiento} onChange={e => setEditRow({ ...editRow, fecha_nacimiento: e.target.value })} /></div>
              <div>
                <Label>Posición principal</Label>
                <Select value={editRow.posicion_principal} onValueChange={v => setEditRow({ ...editRow, posicion_principal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POSICIONES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posición alternativa</Label>
                <Select value={editRow.posicion_alternativa ?? 'Ninguna'} onValueChange={v => setEditRow({ ...editRow, posicion_alternativa: v === 'Ninguna' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ninguna">Ninguna</SelectItem>
                    {POSICIONES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Continúa</Label>
                <Select value={editRow.continuar_equipo} onValueChange={v => setEditRow({ ...editRow, continuar_equipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Sí">Sí</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Motivo no continúa</Label><Textarea rows={2} value={editRow.motivo_no_continuar ?? ''} onChange={e => setEditRow({ ...editRow, motivo_no_continuar: e.target.value || null })} /></div>
              <div>
                <Label>Disponible 12 agosto</Label>
                <Select value={editRow.disponible_12_agosto} onValueChange={v => setEditRow({ ...editRow, disponible_12_agosto: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Sí">Sí</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Fecha incorporación</Label><Input type="date" value={editRow.fecha_incorporacion ?? ''} onChange={e => setEditRow({ ...editRow, fecha_incorporacion: e.target.value || null })} /></div>
              <div><Label>Compromisos agosto</Label><Textarea rows={2} value={editRow.compromisos_agosto ?? ''} onChange={e => setEditRow({ ...editRow, compromisos_agosto: e.target.value || null })} /></div>
              <div><Label>Observaciones</Label><Textarea rows={2} value={editRow.observaciones ?? ''} onChange={e => setEditRow({ ...editRow, observaciones: e.target.value || null })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

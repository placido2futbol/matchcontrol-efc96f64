import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Share2, FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Session {
  id: string; microcycle: string | null; session_number: string | null; session_date: string | null;
  category: string | null; season: string | null; coach: string | null; objective: string | null;
}
interface Task {
  id: string; name: string; task_type: string | null; description: string | null; image_url: string | null;
  work_time: string | null; rest_time: string | null; players_count: string | null; space: string | null;
  difficulty: string | null; material: string | null;
}
interface SessionTask {
  id: string; task_id: string | null; order_index: number; custom_notes: string | null; task_snapshot: any;
  task?: Task | null;
}

export default function SessionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<SessionTask[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    if (!id || !user) return;
    const [{ data: s }, { data: st }, { data: t }] = await Promise.all([
      supabase.from('training_sessions').select('*').eq('id', id).maybeSingle(),
      supabase.from('session_tasks').select('*, task:training_tasks(*)').eq('session_id', id).order('order_index'),
      supabase.from('training_tasks').select('*').eq('user_id', user.id).order('name'),
    ]);
    setSession(s as Session);
    setItems((st || []) as any);
    setTasks((t || []) as any);
  };
  useEffect(() => { load(); }, [id, user]);

  const saveSession = async () => {
    if (!session) return;
    const { id: sid, ...rest } = session as any;
    const { error } = await supabase.from('training_sessions').update(rest).eq('id', sid);
    if (error) return toast.error(error.message);
    toast.success('Guardado');
  };

  const addTask = async (t: Task) => {
    if (!id) return;
    const order_index = items.length;
    const { data, error } = await supabase.from('session_tasks')
      .insert({ session_id: id, task_id: t.id, order_index }).select('*, task:training_tasks(*)').single();
    if (error) return toast.error(error.message);
    setItems(prev => [...prev, data as any]);
    setPickerOpen(false);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from('session_tasks').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId).map((i, idx) => ({ ...i, order_index: idx })));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    const reordered = copy.map((i, k) => ({ ...i, order_index: k }));
    setItems(reordered);
    await Promise.all(reordered.map(i => supabase.from('session_tasks').update({ order_index: i.order_index }).eq('id', i.id)));
  };

  const updateNotes = async (itemId: string, notes: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, custom_notes: notes } : i));
    await supabase.from('session_tasks').update({ custom_notes: notes }).eq('id', itemId);
  };

  const share = async () => {
    if (!id || !user) return;
    const token = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('shared_training_links').insert({ session_id: id, user_id: user.id, token });
    if (error) return toast.error(error.message);
    const url = `${window.location.origin}/entrenamientos/publico/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const exportPDF = () => {
    if (!session) return;
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(16); doc.text(`Sesión ${session.session_number || ''}`, 14, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Fecha: ${session.session_date || '—'} | Categoría: ${session.category || '—'} | Entrenador: ${session.coach || '—'}`, 14, y); y += 6;
    if (session.objective) { doc.text(`Objetivo: ${session.objective}`, 14, y); y += 8; }
    items.forEach((it, i) => {
      if (y > 270) { doc.addPage(); y = 15; }
      const t = it.task;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${t?.name || 'Tarea'}`, 14, y); y += 6;
      doc.setFont(undefined, 'normal'); doc.setFontSize(9);
      const meta = [t?.task_type, t?.work_time && `Trabajo: ${t.work_time}`, t?.rest_time && `Descanso: ${t.rest_time}`, t?.players_count && `Jug.: ${t.players_count}`, t?.space && `Espacio: ${t.space}`].filter(Boolean).join(' · ');
      if (meta) { doc.text(meta, 14, y); y += 5; }
      if (t?.material) { doc.text(`Material: ${t.material}`, 14, y); y += 5; }
      if (t?.description) { const lines = doc.splitTextToSize(t.description, 180); doc.text(lines, 14, y); y += lines.length * 4 + 2; }
      if (it.custom_notes) { const lines = doc.splitTextToSize(`Notas: ${it.custom_notes}`, 180); doc.text(lines, 14, y); y += lines.length * 4 + 2; }
      y += 4;
    });
    doc.save(`sesion-${session.session_number || 'entrenamiento'}.pdf`);
  };

  const filteredTasks = useMemo(() =>
    tasks.filter(t => !q || `${t.name} ${t.task_type ?? ''}`.toLowerCase().includes(q.toLowerCase())),
    [tasks, q]);

  if (!session) return <div className="p-4">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/entrenamientos')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        <h1 className="font-display text-xl flex-1">Editor de sesión</h1>
        <Button size="sm" variant="outline" onClick={share}><Share2 className="h-4 w-4 mr-1" /> Compartir</Button>
        <Button size="sm" variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
        <Button size="sm" onClick={saveSession}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
      </div>

      <Card><CardContent className="p-4 grid gap-3 sm:grid-cols-3">
        <div><Label>Microciclo</Label><Input value={session.microcycle || ''} onChange={e => setSession({ ...session, microcycle: e.target.value })} /></div>
        <div><Label>Nº sesión</Label><Input value={session.session_number || ''} onChange={e => setSession({ ...session, session_number: e.target.value })} /></div>
        <div><Label>Fecha</Label><Input type="date" value={session.session_date || ''} onChange={e => setSession({ ...session, session_date: e.target.value })} /></div>
        <div><Label>Categoría</Label><Input value={session.category || ''} onChange={e => setSession({ ...session, category: e.target.value })} /></div>
        <div><Label>Temporada</Label><Input value={session.season || ''} onChange={e => setSession({ ...session, season: e.target.value })} /></div>
        <div><Label>Entrenador</Label><Input value={session.coach || ''} onChange={e => setSession({ ...session, coach: e.target.value })} /></div>
        <div className="sm:col-span-3"><Label>Objetivo</Label><Textarea rows={2} value={session.objective || ''} onChange={e => setSession({ ...session, objective: e.target.value })} /></div>
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Tareas ({items.length})</h2>
        <Button size="sm" onClick={() => setPickerOpen(true)}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <Card key={it.id}>
            <CardContent className="p-3">
              <div className="flex gap-3">
                {it.task?.image_url && <img src={it.task.image_url} alt="" className="h-20 w-28 object-cover rounded" />}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold">{idx + 1}. {it.task?.name || '—'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.task?.task_type && <Badge variant="secondary" className="text-[10px]">{it.task.task_type}</Badge>}
                        {it.task?.work_time && <Badge variant="outline" className="text-[10px]">Trab: {it.task.work_time}</Badge>}
                        {it.task?.rest_time && <Badge variant="outline" className="text-[10px]">Desc: {it.task.rest_time}</Badge>}
                        {it.task?.players_count && <Badge variant="outline" className="text-[10px]">Jug: {it.task.players_count}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)}><ChevronUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)}><ChevronDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {it.task?.description && <p className="text-xs text-muted-foreground">{it.task.description}</p>}
                  <Textarea placeholder="Notas específicas para esta sesión..." rows={2} value={it.custom_notes || ''} onChange={e => updateNotes(it.id, e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Añade tareas desde tu biblioteca.</p>}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Añadir tarea</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} className="pl-8" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 mt-3">
            {filteredTasks.map(t => (
              <button key={t.id} onClick={() => addTask(t)} className="text-left p-3 rounded-lg border hover:bg-muted transition">
                <p className="font-semibold text-sm">{t.name}</p>
                {t.task_type && <Badge variant="secondary" className="text-[10px] mt-1">{t.task_type}</Badge>}
              </button>
            ))}
            {filteredTasks.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No hay tareas.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

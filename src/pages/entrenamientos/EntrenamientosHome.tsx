import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Star, Trash2, Pencil, ArrowLeft, Search, Upload, Image as ImageIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ImportPreviewDialog from '@/components/entrenamientos/ImportPreviewDialog';
import { parseWordExercises } from '@/lib/trainingImport/docxParser';
import { parseExcelExercises } from '@/lib/trainingImport/excelParser';
import type { ParsedExercise, ParseResult } from '@/lib/trainingImport/types';


interface TrainingTask {
  id: string;
  name: string;
  task_type: string | null;
  didactic_form: string | null;
  difficulty: string | null;
  demand: string | null;
  space: string | null;
  players_count: string | null;
  work_time: string | null;
  rest_time: string | null;
  complexity: string | null;
  competitiveness: string | null;
  description: string | null;
  image_url: string | null;
  material: string | null;
  is_favorite: boolean;
}

interface TrainingSession {
  id: string;
  microcycle: string | null;
  session_number: string | null;
  session_date: string | null;
  category: string | null;
  season: string | null;
  coach: string | null;
  objective: string | null;
  is_template: boolean;
}

const TASK_TYPES = ['Calentamiento', 'Técnica', 'Táctica', 'Físico', 'Estrategia', 'Partido', 'Vuelta a la calma'];
const DIFFICULTIES = ['Baja', 'Media', 'Alta'];
const DEMANDS = ['Baja', 'Media', 'Alta'];

const EMPTY_TASK: Partial<TrainingTask> = {
  name: '', task_type: '', didactic_form: '', difficulty: '', demand: '',
  space: '', players_count: '', work_time: '', rest_time: '',
  complexity: '', competitiveness: '', description: '', image_url: '', material: '', is_favorite: false,
};

export default function EntrenamientosHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('sesiones');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('all');
  const [fFav, setFFav] = useState(false);

  // task editor
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<TrainingTask> | null>(null);

  // session creator
  const [sessionDialog, setSessionDialog] = useState(false);
  // importer
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ParseResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const [newSession, setNewSession] = useState<Partial<TrainingSession>>({
    microcycle: '', session_number: '', session_date: new Date().toISOString().slice(0, 10),
    category: '', season: '2026/2027', coach: '', objective: '',
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [s, t] = await Promise.all([
      supabase.from('training_sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: false }),
      supabase.from('training_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setSessions(s.data || []);
    setTasks(t.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const saveTask = async () => {
    if (!user || !editingTask?.name) { toast.error('El nombre es obligatorio'); return; }
    const payload = { ...editingTask, user_id: user.id } as any;
    const { id, ...rest } = payload;
    if (id) {
      const { error } = await supabase.from('training_tasks').update(rest).eq('id', id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from('training_tasks').insert(rest);
      if (error) return toast.error(error.message);
    }
    toast.success('Ejercicio guardado');
    setTaskDialog(false); setEditingTask(null);
    load();
  };

  const deleteTask = async (id: string) => {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    await supabase.from('training_tasks').delete().eq('id', id);
    load();
  };

  const toggleFav = async (t: TrainingTask) => {
    await supabase.from('training_tasks').update({ is_favorite: !t.is_favorite }).eq('id', t.id);
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };

  const uploadImage = async (file: File) => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('training-images').upload(path, file);
    if (error) { toast.error(error.message); return null; }
    const { data } = await supabase.storage.from('training-images').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl ?? null;
  };

  const createSession = async () => {
    if (!user) return;
    const payload = { ...newSession, user_id: user.id } as any;
    const { data, error } = await supabase.from('training_sessions').insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success('Sesión creada');
    setSessionDialog(false);
    navigate(`/entrenamientos/sesion/${data.id}`);
  };

  const deleteSession = async (id: string) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    await supabase.from('training_sessions').delete().eq('id', id);
    load();
  };

  const duplicateSession = async (s: TrainingSession) => {
    if (!user) return;
    const { id, ...rest } = s as any;
    const { data: newS, error } = await supabase.from('training_sessions')
      .insert({ ...rest, user_id: user.id, session_date: new Date().toISOString().slice(0, 10) })
      .select().single();
    if (error) return toast.error(error.message);
    const { data: oldTasks } = await supabase.from('session_tasks').select('*').eq('session_id', id);
    if (oldTasks?.length) {
      await supabase.from('session_tasks').insert(
        oldTasks.map(ot => ({ session_id: newS.id, task_id: ot.task_id, order_index: ot.order_index, custom_notes: ot.custom_notes, task_snapshot: ot.task_snapshot }))
      );
    }
    toast.success('Sesión duplicada');
    load();
  };

  const handleImportFile = async (file: File) => {
    if (!user) return;
    try {
      const buf = await file.arrayBuffer();
      const isWord = /\.docx?$/i.test(file.name);
      const base = file.name.replace(/\.[^.]+$/, '');
      const res = isWord ? await parseWordExercises(buf, base) : parseExcelExercises(buf, base);
      if (!res.exercises.length) { toast.error('No se ha detectado ningún ejercicio en el archivo'); return; }
      setImportFileName(file.name);
      setImportResult(res);
      setImportOpen(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const uploadParsedImage = async (ex: ParsedExercise) => {
    if (!user || !ex.imagen) return null;
    const bytes = new Uint8Array(ex.imagen.data);
    const path = `${user.id}/import/${Date.now()}-${Math.random().toString(36).slice(2)}.${ex.imagen.ext}`;
    const { error } = await supabase.storage.from('training-images').upload(path, bytes, {
      contentType: `image/${ex.imagen.ext === 'jpg' ? 'jpeg' : ex.imagen.ext}`,
    });
    if (error) return null;
    const { data } = await supabase.storage.from('training-images').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl ?? null;
  };

  const confirmImport = async (exercises: ParsedExercise[], tematica: string) => {
    if (!user) return;
    setImporting(true);
    try {
      const items = [] as any[];
      for (const ex of exercises) {
        const image_url = await uploadParsedImage(ex);
        items.push({
          user_id: user.id,
          name: ex.titulo || 'Sin nombre',
          description: ex.explicacion || null,
          instructions: ex.consignas || null,
          total_time: ex.tiempo_total || null,
          partial_time: ex.tiempo_parcial || null,
          repetitions: ex.repeticiones || null,
          rest_time: ex.descanso || null,
          material: ex.material || null,
          theme: tematica || null,
          tags: ex.subtematicas,
          image_url,
        });
      }
      const { error } = await supabase.from('training_tasks').insert(items);
      if (error) throw error;
      toast.success(`${items.length} ejercicios importados`);
      setImportOpen(false);
      setImportResult(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  };


  const filteredTasks = tasks.filter(t => {
    if (fFav && !t.is_favorite) return false;
    if (fType !== 'all' && t.task_type !== fType) return false;
    if (q && !`${t.name} ${t.description ?? ''} ${t.material ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        <h1 className="font-display text-xl sm:text-2xl">🏃 Entrenamientos</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
          <TabsTrigger value="ejercicios">Ejercicios</TabsTrigger>
        </TabsList>

        <TabsContent value="sesiones" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-lg">Mis sesiones</h2>
            <Button size="sm" onClick={() => setSessionDialog(true)}><Plus className="h-4 w-4 mr-1" /> Nueva sesión</Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> :
            sessions.length === 0 ? <p className="text-sm text-muted-foreground">No hay sesiones todavía.</p> :
              <div className="grid gap-3 sm:grid-cols-2">
                {sessions.map(s => (
                  <Card key={s.id} className="hover:shadow-md transition">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">Sesión {s.session_number || ''} {s.microcycle && `· MC ${s.microcycle}`}</p>
                          <p className="text-xs text-muted-foreground">{s.session_date} · {s.category || '—'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateSession(s)}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSession(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      {s.objective && <p className="text-xs line-clamp-2">{s.objective}</p>}
                      <Button size="sm" className="w-full" onClick={() => navigate(`/entrenamientos/sesion/${s.id}`)}>Abrir</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
          }
        </TabsContent>

        <TabsContent value="ejercicios" className="space-y-3 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." className="pl-8 h-9" />
            </div>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant={fFav ? 'default' : 'outline'} onClick={() => setFFav(!fFav)}>
              <Star className={`h-4 w-4 mr-1 ${fFav ? 'fill-current' : ''}`} /> Favoritos
            </Button>
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImportFile(f); }} />
              <span className="inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted"><Upload className="h-4 w-4 mr-1" /> Excel</span>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept=".docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImportFile(f); }} />
              <span className="inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted"><Upload className="h-4 w-4 mr-1" /> Word</span>
            </label>

            <Button size="sm" onClick={() => { setEditingTask({ ...EMPTY_TASK }); setTaskDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map(t => (
              <Card key={t.id} className="overflow-hidden hover:shadow-md transition">
                {t.image_url && <img src={t.image_url} alt={t.name} className="w-full h-32 object-cover" />}
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <button onClick={() => toggleFav(t)}><Star className={`h-4 w-4 ${t.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.task_type && <Badge variant="secondary" className="text-[10px]">{t.task_type}</Badge>}
                    {t.difficulty && <Badge variant="outline" className="text-[10px]">Dif: {t.difficulty}</Badge>}
                    {t.demand && <Badge variant="outline" className="text-[10px]">Exig: {t.demand}</Badge>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setEditingTask(t); setTaskDialog(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredTasks.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No hay ejercicios que coincidan.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task editor dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTask?.id ? 'Editar' : 'Nuevo'} ejercicio</DialogTitle></DialogHeader>
          {editingTask && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nombre *</Label>
                <Input value={editingTask.name || ''} onChange={e => setEditingTask({ ...editingTask, name: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editingTask.task_type || ''} onValueChange={v => setEditingTask({ ...editingTask, task_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Forma didáctica</Label><Input value={editingTask.didactic_form || ''} onChange={e => setEditingTask({ ...editingTask, didactic_form: e.target.value })} /></div>
              <div>
                <Label>Dificultad</Label>
                <Select value={editingTask.difficulty || ''} onValueChange={v => setEditingTask({ ...editingTask, difficulty: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exigencia</Label>
                <Select value={editingTask.demand || ''} onValueChange={v => setEditingTask({ ...editingTask, demand: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{DEMANDS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Espacio</Label><Input value={editingTask.space || ''} onChange={e => setEditingTask({ ...editingTask, space: e.target.value })} /></div>
              <div><Label>Jugadores</Label><Input value={editingTask.players_count || ''} onChange={e => setEditingTask({ ...editingTask, players_count: e.target.value })} /></div>
              <div><Label>Tiempo trabajo</Label><Input value={editingTask.work_time || ''} onChange={e => setEditingTask({ ...editingTask, work_time: e.target.value })} /></div>
              <div><Label>Tiempo descanso</Label><Input value={editingTask.rest_time || ''} onChange={e => setEditingTask({ ...editingTask, rest_time: e.target.value })} /></div>
              <div><Label>Complejidad</Label><Input value={editingTask.complexity || ''} onChange={e => setEditingTask({ ...editingTask, complexity: e.target.value })} /></div>
              <div><Label>Competitividad</Label><Input value={editingTask.competitiveness || ''} onChange={e => setEditingTask({ ...editingTask, competitiveness: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Material</Label><Input value={editingTask.material || ''} onChange={e => setEditingTask({ ...editingTask, material: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Descripción</Label><Textarea rows={4} value={editingTask.description || ''} onChange={e => setEditingTask({ ...editingTask, description: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Imagen</Label>
                <div className="flex items-center gap-2">
                  {editingTask.image_url && <img src={editingTask.image_url} alt="" className="h-16 w-24 object-cover rounded border" />}
                  <label className="cursor-pointer inline-flex items-center h-9 px-3 rounded-md border text-sm hover:bg-muted">
                    <ImageIcon className="h-4 w-4 mr-1" /> Subir
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadImage(f);
                      if (url) setEditingTask(prev => prev ? { ...prev, image_url: url } : prev);
                    }} />
                  </label>
                  {editingTask.image_url && <Button size="sm" variant="ghost" onClick={() => setEditingTask({ ...editingTask, image_url: '' })}>Quitar</Button>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTaskDialog(false)}>Cancelar</Button>
            <Button onClick={saveTask}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session creator dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva sesión</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Microciclo</Label><Input value={newSession.microcycle || ''} onChange={e => setNewSession({ ...newSession, microcycle: e.target.value })} /></div>
            <div><Label>Nº sesión</Label><Input value={newSession.session_number || ''} onChange={e => setNewSession({ ...newSession, session_number: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={newSession.session_date || ''} onChange={e => setNewSession({ ...newSession, session_date: e.target.value })} /></div>
            <div><Label>Categoría</Label><Input value={newSession.category || ''} onChange={e => setNewSession({ ...newSession, category: e.target.value })} /></div>
            <div><Label>Temporada</Label><Input value={newSession.season || ''} onChange={e => setNewSession({ ...newSession, season: e.target.value })} /></div>
            <div><Label>Entrenador</Label><Input value={newSession.coach || ''} onChange={e => setNewSession({ ...newSession, coach: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Objetivo</Label><Textarea rows={2} value={newSession.objective || ''} onChange={e => setNewSession({ ...newSession, objective: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSessionDialog(false)}>Cancelar</Button>
            <Button onClick={createSession}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportPreviewDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        result={importResult}
        fileName={importFileName}
        importing={importing}
        onConfirm={confirmImport}
      />
    </div>

  );
}

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Square, Settings2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildAnnouncement, DEFAULT_TEMPLATES, type LineupTemplates, type SegmentBlock } from '@/lib/lineupSpeech';
import { getAudio, putAudio, deleteAudio, audioCacheKey } from '@/lib/lineupAudioStore';
import type { MatchPlayer } from './PlayerRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LINEUP_VOICES, LINEUP_STYLES } from '../../../supabase/functions/_shared/lineupVoice';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lineup-speech`;
const LS_TEMPLATES = 'mc_lineup_templates';
const LS_VOICE = 'mc_lineup_voice';
const RECORDABLE: { block: SegmentBlock; label: string }[] = [
  { block: 'intro', label: 'Introducción' }, { block: 'coach', label: 'Entrenador' },
  { block: 'delegate', label: 'Delegada' }, { block: 'outro', label: 'Cierre' },
];

function loadTemplates(): LineupTemplates {
  try { return { ...DEFAULT_TEMPLATES, ...JSON.parse(localStorage.getItem(LS_TEMPLATES) || '{}') }; }
  catch { return DEFAULT_TEMPLATES; }
}

async function synth(text: string, voice: string, style: string, signal: AbortSignal): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ text, voice, style }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.blob();
}

/** Returns manual recording, cached audio, or (only if missing) a newly generated one. */
async function getSegmentBlob(block: SegmentBlock, text: string, voice: string, style: string, signal: AbortSignal) {
  if (RECORDABLE.some(r => r.block === block)) {
    const rec = await getAudio('recordings', block).catch(() => undefined);
    if (rec) return rec;
  }
  const key = await audioCacheKey(voice, style, text);
  const cached = await getAudio('generated', key).catch(() => undefined);
  if (cached) return cached;
  const blob = await synth(text, voice, style, signal);
  await putAudio('generated', key, blob).catch(() => toast.warning("No s'ha pogut desar l'àudio a la memòria"));
  return blob;
}

export default function LineupAnnouncer({ starters, subs }: { starters: MatchPlayer[]; subs: MatchPlayer[] }) {
  const [playing, setPlaying] = useState(false);
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS_VOICE) || '{}'); } catch { return {}; } })();
  const [voice, setVoice] = useState<string>(saved.voice || 'Fenrir');
  const [style, setStyle] = useState<string>(saved.style || 'stadium');
  const [templates, setTemplates] = useState<LineupTemplates>(loadTemplates);
  const [draft, setDraft] = useState<LineupTemplates>(templates);
  const [recordings, setRecordings] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => { localStorage.setItem(LS_VOICE, JSON.stringify({ voice, style })); }, [voice, style]);
  const refreshRecordings = async () => {
    const r: Record<string, boolean> = {};
    for (const { block } of RECORDABLE) r[block] = !!(await getAudio('recordings', block).catch(() => undefined));
    setRecordings(r);
  };
  useEffect(() => { refreshRecordings(); }, []);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    audioRef.current = null;
    urlsRef.current.forEach(url => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    setPlaying(false);
  };
  useEffect(() => () => stop(), []);

  const start = async () => {
    const script = buildAnnouncement(starters, subs, templates, style);
    if (!script.some(s => s.block === 'starter' || s.block === 'sub')) { toast.error("No hi ha jugadors a l'alineació"); return; }
    stop();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPlaying(true);
    const fetchSegment = (i: number) => getSegmentBlob(script[i].block, script[i].text, voice, style, ctrl.signal)
      .then(blob => {
        if (ctrl.signal.aborted) return { url: null, error: null };
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        return { url, error: null };
      }).catch((error: unknown) => ({ url: null, error }));
    try {
      let next = fetchSegment(0);
      for (let i = 0; i < script.length; i++) {
        const result = await next;
        if (ctrl.signal.aborted) return;
        if (result.error) throw result.error;
        const url = result.url;
        if (!url) return;
        if (i + 1 < script.length) next = fetchSegment(i + 1);
        await new Promise<void>((resolve, reject) => {
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = () => { URL.revokeObjectURL(url); urlsRef.current.delete(url); resolve(); };
          a.onerror = () => { if (ctrl.signal.aborted) resolve(); else reject(new Error("No s'ha pogut reproduir l'àudio")); };
          a.onpause = () => { if (ctrl.signal.aborted) resolve(); };
          a.play().catch(err => { if (ctrl.signal.aborted) resolve(); else reject(err); });
        });
        if (ctrl.signal.aborted) return;
        // Short pause between players, longer one when changing block
        const changesBlock = i + 1 < script.length && script[i + 1].block !== script[i].block;
        await new Promise(r => setTimeout(r, changesBlock ? 1100 : 450));
      }
    } catch (e: unknown) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : 'Error en la presentació');
    } finally {
      if (abortRef.current === ctrl) stop();
    }
  };

  const saveTemplates = () => {
    localStorage.setItem(LS_TEMPLATES, JSON.stringify(draft));
    setTemplates(draft);
    setConfigOpen(false);
    toast.success('Locucions desades');
  };

  const uploadRecording = async (block: SegmentBlock, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) { toast.error('El fitxer ha de ser un àudio'); return; }
    try { await putAudio('recordings', block, file); toast.success('Gravació desada'); }
    catch { toast.error("No s'ha pogut desar la gravació"); }
    refreshRecordings();
  };
  const removeRecording = async (block: SegmentBlock) => {
    try { await deleteAudio('recordings', block); } catch { toast.error("No s'ha pogut esborrar"); }
    refreshRecordings();
  };

  const field = (key: keyof LineupTemplates, label: string, multiline = true) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-foreground">{label}</label>
      {multiline
        ? <Textarea rows={2} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />
        : <Input value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}
    </div>
  );

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Select value={voice} onValueChange={setVoice} disabled={playing}>
        <SelectTrigger aria-label="Voz de la presentación" className="h-9 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{LINEUP_VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={style} onValueChange={setStyle} disabled={playing}>
        <SelectTrigger aria-label="Estilo de la presentación" className="h-9 w-36"><SelectValue /></SelectTrigger>
        <SelectContent>{LINEUP_STYLES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      <Dialog open={configOpen} onOpenChange={o => { setConfigOpen(o); if (o) setDraft(templates); }}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={playing}><Settings2 className="h-4 w-4 mr-1" /> Configurar locuciones</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configurar locuciones</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Variables: {'{nombre}'} y {'{dorsal}'}.</p>
          <div className="space-y-3">
            {field('intro', 'Introducción')}
            {field('starter', 'Titulares (por jugador)')}
            {field('sub', 'Suplentes (por jugador)')}
            {field('coachName', 'Nombre del entrenador', false)}
            {field('coach', 'Locución entrenador')}
            {field('delegateName', 'Nombre de la delegada', false)}
            {field('delegate', 'Locución delegada')}
            {field('outro', 'Cierre')}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-bold text-foreground">Grabaciones propias (sustituyen a la voz IA)</p>
              {RECORDABLE.map(({ block, label }) => (
                <div key={block} className="flex items-center gap-2 text-xs">
                  <span className="w-24">{label}</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer text-primary">
                    <Upload className="h-3 w-3" /> {recordings[block] ? 'Cambiar' : 'Subir'}
                    <input type="file" accept="audio/*" className="hidden" onChange={e => { uploadRecording(block, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {recordings[block] && (
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => removeRecording(block)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(DEFAULT_TEMPLATES)}>Restaurar</Button>
            <Button onClick={saveTemplates}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" onClick={start} disabled={playing}>
        {playing ? '🎙️ Presentant…' : '🎙️ Presentar alineación'}
      </Button>
      <Button size="sm" variant="destructive" onClick={stop} disabled={!playing}>
        <Square className="h-4 w-4 mr-1" /> Aturar
      </Button>
    </div>
  );
}

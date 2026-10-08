import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildLineupScript } from '@/lib/lineupSpeech';
import type { MatchPlayer } from './PlayerRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LINEUP_VOICES, LINEUP_STYLES } from '../../../supabase/functions/_shared/lineupVoice';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lineup-speech`;

async function synth(text: string, voice: string, style: string, signal: AbortSignal): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: 'POST',
    signal,
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
  return URL.createObjectURL(await res.blob());
}

export default function LineupAnnouncer({ starters }: { starters: MatchPlayer[] }) {
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState<string>('Fenrir');
  const [style, setStyle] = useState<string>('stadium');
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef(new Set<string>());

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    urlsRef.current.forEach(url => URL.revokeObjectURL(url));
    urlsRef.current.clear();
    setPlaying(false);
  };
  useEffect(() => () => stop(), []);

  const start = async () => {
    const script = buildLineupScript(starters, style);
    if (script.length <= 2) { toast.error("No hi ha jugadors a l'alineació"); return; }
    stop();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPlaying(true);
    const fetchSegment = (text: string) => synth(text, voice, style, ctrl.signal)
      .then(url => {
        if (ctrl.signal.aborted) { URL.revokeObjectURL(url); return { url: null, error: null }; }
        urlsRef.current.add(url);
        return { url, error: null };
      }).catch((error: unknown) => ({ url: null, error }));
    try {
      // Pre-fetch next segment while the current one plays
      let next = fetchSegment(script[0]);
      for (let i = 0; i < script.length; i++) {
        const result = await next;
        if (ctrl.signal.aborted) return;
        if (result.error) throw result.error;
        const url = result.url;
        if (!url) return;
        if (i + 1 < script.length) next = fetchSegment(script[i + 1]);
        await new Promise<void>((resolve, reject) => {
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = () => { URL.revokeObjectURL(url); urlsRef.current.delete(url); resolve(); };
          a.onerror = () => reject(new Error("No s'ha pogut reproduir l'àudio"));
          a.onpause = () => { if (ctrl.signal.aborted) resolve(); };
          a.play().catch(reject);
        });
        if (ctrl.signal.aborted) return;
        await new Promise(r => setTimeout(r, 450));
      }
    } catch (e: unknown) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : 'Error en la presentació');
    } finally {
      if (abortRef.current === ctrl) stop();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-2">
      <Select value={voice} onValueChange={setVoice} disabled={playing}>
        <SelectTrigger aria-label="Voz de la presentación" className="h-9 w-44"><SelectValue /></SelectTrigger>
        <SelectContent>{LINEUP_VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={style} onValueChange={setStyle} disabled={playing}>
        <SelectTrigger aria-label="Estilo de la presentación" className="h-9 w-44"><SelectValue /></SelectTrigger>
        <SelectContent>{LINEUP_STYLES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" onClick={start} disabled={playing}>
        {playing ? '🎙️ Presentant…' : '🎙️ Presentar alineació'}
      </Button>
      {playing && (
        <Button size="sm" variant="destructive" onClick={stop}>
          <Square className="h-4 w-4 mr-1" /> Aturar
        </Button>
      )}
    </div>
  );
}

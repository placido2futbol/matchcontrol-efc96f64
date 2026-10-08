import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildLineupScript } from '@/lib/lineupSpeech';
import type { MatchPlayer } from './PlayerRow';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lineup-speech`;

async function synth(text: string, signal: AbortSignal): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

export default function LineupAnnouncer({ starters }: { starters: MatchPlayer[] }) {
  const [playing, setPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  };
  useEffect(() => () => stop(), []);

  const start = async () => {
    const script = buildLineupScript(starters);
    if (script.length <= 2) { toast.error("No hi ha jugadors a l'alineació"); return; }
    stop();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPlaying(true);
    try {
      // Pre-fetch next segment while the current one plays
      let next = synth(script[0], ctrl.signal);
      for (let i = 0; i < script.length; i++) {
        const url = await next;
        if (i + 1 < script.length) next = synth(script[i + 1], ctrl.signal);
        if (ctrl.signal.aborted) return;
        await new Promise<void>((resolve, reject) => {
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = () => { URL.revokeObjectURL(url); resolve(); };
          a.onerror = () => reject(new Error("No s'ha pogut reproduir l'àudio"));
          a.onpause = () => { if (ctrl.signal.aborted) resolve(); };
          a.play().catch(reject);
        });
        if (ctrl.signal.aborted) return;
        await new Promise(r => setTimeout(r, 450));
      }
    } catch (e: any) {
      if (!ctrl.signal.aborted) toast.error(e.message || 'Error en la presentació');
    } finally {
      if (abortRef.current === ctrl) { abortRef.current = null; setPlaying(false); }
    }
  };

  return (
    <div className="flex gap-2 justify-center mb-2">
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

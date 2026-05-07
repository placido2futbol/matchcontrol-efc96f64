import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Team } from '@/hooks/useTeams';

interface PlayerLike {
  player_name: string;
  dorsal: string;
}

interface Props {
  team?: Team;
  opponent: string;
  matchDate: string;
  matchTime: string;
  callupTime: string;
  callupLocation: string;
  starters: PlayerLike[];
  substitutePlayers: PlayerLike[];
  whatsappFooter: string;
  setWhatsappFooter: (v: string) => void;
}

export default function CallupExportTab({
  team, opponent, matchDate, matchTime, callupTime, callupLocation,
  starters, substitutePlayers, whatsappFooter, setWhatsappFooter,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  const allCalled = [...starters, ...substitutePlayers]
    .sort((a, b) => (parseInt(a.dorsal) || 999) - (parseInt(b.dorsal) || 999));

  const downloadImage = async () => {
    if (!previewRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `convocatoria-${matchDate || 'sin-fecha'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagen descargada');
    } catch {
      toast.error('Error generando imagen');
    }
  };

  const buildText = () => {
    let text = `📋 *CONVOCATORIA*\n`;
    if (team) text += `🏟️ ${team.name}\n`;
    if (opponent) text += `⚽ vs ${opponent}\n`;
    if (matchDate) text += `📅 ${matchDate}`;
    if (matchTime) text += ` ⏰ ${matchTime}h`;
    text += '\n';
    if (callupTime) text += `🕐 Convocatoria: ${callupTime}h\n`;
    if (callupLocation) text += `📍 ${callupLocation}\n`;
    text += '\n';
    if (allCalled.length > 0) {
      text += `*CONVOCADOS (${allCalled.length}):*\n`;
      allCalled.forEach(p => { text += `  ${p.dorsal} - ${p.player_name}\n`; });
    }
    if (whatsappFooter.trim()) text += `\n${whatsappFooter}`;
    return text;
  };

  const shareToWhatsApp = async () => {
    if (!previewRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewRef.current, { backgroundColor: null, scale: 2 });
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `convocatoria-${matchDate || 'sin-fecha'}.png`, { type: 'image/png' });
          try {
            await navigator.share({ title: `Convocatoria ${opponent ? 'vs ' + opponent : ''}`, files: [file] });
          } catch { fallbackWhatsApp(); }
        }, 'image/png');
      } else {
        fallbackWhatsApp();
      }
    } catch {
      toast.error('Error generando imagen');
    }
  };

  const fallbackWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildText())}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(buildText().replace(/\*/g, ''));
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-4">
      <div ref={previewRef} className="rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-foreground/95 via-foreground/85 to-foreground/95 text-background p-4">
        <div className="text-center mb-4">
          {team?.crest_url && <img src={team.crest_url} alt="" className="h-12 w-12 mx-auto mb-2 object-contain" />}
          <h2 className="text-sm font-black tracking-wider uppercase">{team?.name || 'Equipo'}</h2>
          <p className="text-background/50 text-[10px] tracking-widest mt-0.5">CONVOCATORIA</p>
          {opponent && <p className="text-background/70 text-[11px] mt-1">vs {opponent}</p>}
          <div className="flex flex-col items-center gap-0.5 text-background/40 text-[10px] mt-1">
            {matchDate && <span>📅 {matchDate}{matchTime ? ` ⏰ ${matchTime}h` : ''}</span>}
            {callupTime && <span>🕐 Convocatoria: {callupTime}h</span>}
            {callupLocation && <span>📍 {callupLocation}</span>}
          </div>
        </div>
        {allCalled.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 border-b border-background/10 pb-1">Convocados ({allCalled.length})</h3>
            <div className="grid grid-cols-2 gap-1">
              {allCalled.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-background/5 rounded-lg p-1.5">
                  <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center text-[9px] font-black shrink-0">{p.dorsal || '?'}</div>
                  <span className="text-[9px] font-semibold truncate">{p.player_name.includes(',') ? p.player_name.split(',').pop()?.trim() : p.player_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensaje WhatsApp (pie de página)</label>
        <Textarea
          value={whatsappFooter}
          onChange={e => setWhatsappFooter(e.target.value)}
          placeholder="Texto adicional para el mensaje de WhatsApp..."
          className="text-xs min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Button className="w-full" size="sm" onClick={downloadImage}>
          <Download className="h-4 w-4 mr-2" />Descargar imagen
        </Button>
        <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" size="sm" onClick={shareToWhatsApp}>
          <Share2 className="h-4 w-4 mr-2" />Compartir por WhatsApp
        </Button>
        <Button variant="outline" className="w-full" size="sm" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />Copiar texto
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Square, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const SANT_PAU_KEY = "SANT PAU D'ORDAL";

interface Row {
  player_name: string;
  goals: number;
  yellow_cards: number;
  red_cards: number;
}

type Category = 'goals' | 'yellow' | 'red';

const CATS: { key: Category; title: string; icon: JSX.Element; accent: string; emoji: string }[] = [
  { key: 'goals', title: 'Máximos Goleadores', icon: <Trophy className="h-5 w-5" />, accent: 'from-amber-400 to-yellow-600', emoji: '⚽' },
  { key: 'yellow', title: 'Más Tarjetas Amarillas', icon: <Square className="h-5 w-5 fill-yellow-400 text-yellow-500" />, accent: 'from-yellow-300 to-yellow-500', emoji: '🟨' },
  { key: 'red', title: 'Más Tarjetas Rojas', icon: <Square className="h-5 w-5 fill-red-500 text-red-600" />, accent: 'from-red-400 to-red-700', emoji: '🟥' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Top3Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Sant Pau teams + roster
      const { data: teams } = await supabase
        .from('teams').select('id, name').eq('user_id', user.id);
      const spTeamIds = (teams || []).filter(t => t.name.toUpperCase().includes(SANT_PAU_KEY)).map(t => t.id);
      let rosterNames = new Set<string>();
      if (spTeamIds.length) {
        const { data: pls } = await supabase.from('players').select('name').in('team_id', spTeamIds);
        (pls || []).forEach(p => rosterNames.add(p.name.trim().toUpperCase()));
      }

      // All match_players for user matches
      const { data: matches } = await supabase.from('matches').select('id').eq('user_id', user.id);
      const matchIds = (matches || []).map(m => m.id);
      if (!matchIds.length) { setLoading(false); return; }

      const { data: mps } = await supabase
        .from('match_players')
        .select('player_name, goals, yellow_cards, red_card')
        .in('match_id', matchIds);

      const agg = new Map<string, Row>();
      (mps || []).forEach(p => {
        const key = (p.player_name || '').trim().toUpperCase();
        if (!key) return;
        if (rosterNames.size && !rosterNames.has(key)) return;
        const cur = agg.get(key) || { player_name: p.player_name, goals: 0, yellow_cards: 0, red_cards: 0 };
        cur.goals += p.goals || 0;
        cur.yellow_cards += p.yellow_cards || 0;
        cur.red_cards += p.red_card ? 1 : 0;
        agg.set(key, cur);
      });
      setRows(Array.from(agg.values()));
      setLoading(false);
    })();
  }, [user]);

  const getTop = (cat: Category) => {
    const sorted = [...rows].sort((a, b) => {
      if (cat === 'goals') return b.goals - a.goals;
      if (cat === 'yellow') return b.yellow_cards - a.yellow_cards;
      return b.red_cards - a.red_cards;
    });
    return sorted.filter(r => {
      if (cat === 'goals') return r.goals > 0;
      if (cat === 'yellow') return r.yellow_cards > 0;
      return r.red_cards > 0;
    }).slice(0, 3);
  };

  const valueOf = (r: Row, cat: Category) =>
    cat === 'goals' ? r.goals : cat === 'yellow' ? r.yellow_cards : r.red_cards;

  const buildText = () => {
    const lines = ["🏆 *RANKING SANT PAU D'ORDAL* 🏆", ''];
    CATS.forEach(c => {
      const top = getTop(c.key);
      if (!top.length) return;
      lines.push(`${c.emoji} *${c.title.toUpperCase()}*`);
      top.forEach((r, i) => {
        lines.push(`${MEDALS[i]} ${r.player_name} — ${valueOf(r, c.key)}`);
      });
      lines.push('');
    });
    lines.push('_Vía MatchControl_');
    return lines.join('\n');
  };

  const shareWhatsApp = () => {
    const txt = encodeURIComponent(buildText());
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  };

  const shareImage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0a0a0a', scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'ranking-sant-pau.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Ranking Sant Pau' });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'ranking-sant-pau.png'; a.click();
          URL.revokeObjectURL(url);
          toast.success('Imagen descargada');
        }
      }, 'image/png');
    } catch (e: any) {
      toast.error('Error generando imagen');
    }
  };

  if (loading) return null;
  const hasData = CATS.some(c => getTop(c.key).length > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm sm:text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Top 3 Sant Pau
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={shareImage}>
            <Download className="h-3.5 w-3.5" /> Imagen
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white" onClick={shareWhatsApp}>
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </Button>
        </div>
      </div>

      <div ref={cardRef} className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-5 shadow-xl border border-primary/20">
        <div className="text-center mb-4">
          <div className="font-display text-lg sm:text-xl text-white tracking-wide">🏆 RANKING SANT PAU 🏆</div>
          <div className="text-[10px] text-white/60 uppercase tracking-widest">Estadísticas Acumuladas</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CATS.map(c => {
            const top = getTop(c.key);
            return (
              <div key={c.key} className="rounded-xl bg-black/40 p-3 border border-white/10">
                <div className={`flex items-center justify-center gap-2 mb-3 py-1.5 rounded-lg bg-gradient-to-r ${c.accent} text-black font-bold text-xs uppercase tracking-wider`}>
                  {c.icon} {c.title}
                </div>
                {top.length === 0 ? (
                  <div className="text-center text-white/40 text-xs py-4">Sin datos</div>
                ) : (
                  <ol className="space-y-1.5">
                    {top.map((r, i) => (
                      <li key={r.player_name} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-white/10' : 'bg-white/5'}`}>
                        <span className="text-lg w-6 text-center">{MEDALS[i]}</span>
                        <span className="flex-1 text-white text-xs sm:text-sm font-medium truncate">{r.player_name}</span>
                        <span className={`font-display text-base sm:text-lg ${i === 0 ? 'text-yellow-300' : 'text-white'}`}>{valueOf(r, c.key)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

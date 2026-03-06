import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SANT_PAU_KEY = "SANT PAU D'ORDAL";

interface MatchInfo {
  id: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
}

interface PlayerMatchStats {
  minutes_played: number;
  goals: number;
  yellow_cards: number;
  red_card: boolean;
}

interface PlayerAccum {
  [matchId: string]: PlayerMatchStats;
}

export default function SantPauGlobalStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [playerData, setPlayerData] = useState<Record<string, PlayerAccum>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get all matches where Sant Pau played
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, match_date, home_team_name, away_team_name, home_score, away_score')
        .eq('user_id', user.id)
        .order('match_date', { ascending: true });

      const spMatches = (allMatches || []).filter(
        m =>
          m.home_team_name.toUpperCase().includes(SANT_PAU_KEY) ||
          m.away_team_name.toUpperCase().includes(SANT_PAU_KEY)
      );

      if (spMatches.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setMatches(spMatches);

      // Get all match_players for those matches on Sant Pau's side
      const matchIds = spMatches.map(m => m.id);
      const { data: players } = await supabase
        .from('match_players')
        .select('match_id, player_name, minutes_played, goals, yellow_cards, red_card, team_side')
        .in('match_id', matchIds);

      // Build lookup: which side is Sant Pau for each match
      const sideMap: Record<string, string> = {};
      spMatches.forEach(m => {
        sideMap[m.id] = m.home_team_name.toUpperCase().includes(SANT_PAU_KEY) ? 'home' : 'away';
      });

      // Accumulate
      const accum: Record<string, PlayerAccum> = {};
      (players || []).forEach(p => {
        if (p.team_side !== sideMap[p.match_id]) return;
        if (!accum[p.player_name]) accum[p.player_name] = {};
        accum[p.player_name][p.match_id] = {
          minutes_played: p.minutes_played,
          goals: p.goals,
          yellow_cards: p.yellow_cards,
          red_card: p.red_card,
        };
      });

      setPlayerData(accum);
      setLoading(false);
    })();
  }, [user]);

  const playerNames = Object.keys(playerData).sort((a, b) => a.localeCompare(b));

  const getSummary = (name: string) => {
    const pd = playerData[name];
    const vals = Object.values(pd);
    return {
      matches: vals.length,
      minutes: vals.reduce((s, v) => s + v.minutes_played, 0),
      goals: vals.reduce((s, v) => s + v.goals, 0),
      yellows: vals.reduce((s, v) => s + v.yellow_cards, 0),
      reds: vals.reduce((s, v) => s + (v.red_card ? 1 : 0), 0),
    };
  };

  const matchLabel = (m: MatchInfo) => {
    const d = m.match_date ? m.match_date.slice(5) : '??';
    const opponent = m.home_team_name.toUpperCase().includes(SANT_PAU_KEY)
      ? m.away_team_name
      : m.home_team_name;
    const short = opponent.length > 12 ? opponent.slice(0, 12) + '…' : opponent;
    return `${d}\nvs ${short}`;
  };

  const matchResult = (m: MatchInfo) => {
    const isHome = m.home_team_name.toUpperCase().includes(SANT_PAU_KEY);
    return isHome ? `${m.home_score}-${m.away_score}` : `${m.away_score}-${m.home_score}`;
  };

  return (
    <div className="max-w-full mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl text-foreground">
          📊 Estadísticas Sant Pau d'Ordal
        </h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground">No hay partidos de Sant Pau d'Ordal guardados.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-muted-foreground sticky left-0 bg-muted z-10 min-w-[120px]">
                  Jugador
                </th>
                {matches.map(m => (
                  <th key={m.id} className="p-2 text-center text-muted-foreground min-w-[80px] whitespace-pre-line">
                    <div className="text-[10px] leading-tight">{matchLabel(m)}</div>
                    <div className="text-xs font-bold text-foreground">{matchResult(m)}</div>
                  </th>
                ))}
                <th className="p-2 text-center font-bold text-foreground bg-primary/10 min-w-[90px]">
                  RESUMEN
                </th>
              </tr>
            </thead>
            <tbody>
              {playerNames.map(name => {
                const summary = getSummary(name);
                return (
                  <tr key={name} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2 text-foreground font-medium sticky left-0 bg-card z-10">
                      {name}
                    </td>
                    {matches.map(m => {
                      const ps = playerData[name]?.[m.id];
                      if (!ps) {
                        return (
                          <td key={m.id} className="p-2 text-center text-muted-foreground">—</td>
                        );
                      }
                      return (
                        <td key={m.id} className="p-2 text-center text-foreground">
                          <div className="text-[10px] text-muted-foreground">{ps.minutes_played}'</div>
                          <div className="flex items-center justify-center gap-1">
                            {ps.goals > 0 && <span className="font-bold">⚽{ps.goals}</span>}
                            {ps.yellow_cards > 0 && <span>🟨{ps.yellow_cards}</span>}
                            {ps.red_card && <span>🟥</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center bg-primary/10">
                      <div className="text-[10px] text-muted-foreground">
                        {summary.matches}P · {summary.minutes}'
                      </div>
                      <div className="flex items-center justify-center gap-1 font-bold text-foreground">
                        {summary.goals > 0 && <span>⚽{summary.goals}</span>}
                        {summary.yellows > 0 && <span>🟨{summary.yellows}</span>}
                        {summary.reds > 0 && <span>🟥{summary.reds}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td className="p-2 text-foreground sticky left-0 bg-muted z-10">TOTAL</td>
                {matches.map(m => {
                  const mPlayers = playerNames
                    .map(n => playerData[n]?.[m.id])
                    .filter(Boolean) as PlayerMatchStats[];
                  const tGoals = mPlayers.reduce((s, p) => s + p.goals, 0);
                  const tYellows = mPlayers.reduce((s, p) => s + p.yellow_cards, 0);
                  const tReds = mPlayers.reduce((s, p) => s + (p.red_card ? 1 : 0), 0);
                  return (
                    <td key={m.id} className="p-2 text-center text-foreground">
                      <div className="flex items-center justify-center gap-1">
                        {tGoals > 0 && <span>⚽{tGoals}</span>}
                        {tYellows > 0 && <span>🟨{tYellows}</span>}
                        {tReds > 0 && <span>🟥{tReds}</span>}
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 text-center bg-primary/10">
                  {(() => {
                    const all = playerNames.map(n => getSummary(n));
                    const tG = all.reduce((s, v) => s + v.goals, 0);
                    const tY = all.reduce((s, v) => s + v.yellows, 0);
                    const tR = all.reduce((s, v) => s + v.reds, 0);
                    return (
                      <div className="flex items-center justify-center gap-1">
                        {tG > 0 && <span>⚽{tG}</span>}
                        {tY > 0 && <span>🟨{tY}</span>}
                        {tR > 0 && <span>🟥{tR}</span>}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

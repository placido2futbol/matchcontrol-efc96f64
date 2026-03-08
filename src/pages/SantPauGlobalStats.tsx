import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calcMinutesFromDbEvents } from '@/lib/calcMinutesFromDbEvents';
import { toast } from 'sonner';

const SANT_PAU_KEY = "SANT PAU D'ORDAL";

interface MatchInfo {
  id: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  total_seconds: number;
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

interface EventRow {
  match_id: string;
  event_type: string;
  details: string | null;
  minute: number;
  team_side: string;
  player_name: string | null;
}

export default function SantPauGlobalStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [playerData, setPlayerData] = useState<Record<string, PlayerAccum>>({});
  const [loading, setLoading] = useState(true);

  const [allRosterNames, setAllRosterNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch matches, and all teams + players in parallel
      const [{ data: allMatches }, { data: allTeams }] = await Promise.all([
        supabase
          .from('matches')
          .select('id, match_date, home_team_name, away_team_name, home_score, away_score, total_seconds')
          .eq('user_id', user.id)
          .order('match_date', { ascending: true }),
        supabase
          .from('teams')
          .select('id, name')
          .eq('user_id', user.id),
      ]);

      // Find Sant Pau team(s) and fetch their roster
      const spTeams = (allTeams || []).filter(t =>
        t.name.toUpperCase().includes(SANT_PAU_KEY)
      );
      let rosterNames: string[] = [];
      if (spTeams.length > 0) {
        const teamIds = spTeams.map(t => t.id);
        const { data: rosterPlayers } = await supabase
          .from('players')
          .select('name')
          .in('team_id', teamIds);
        rosterNames = (rosterPlayers || []).map(p => p.name);
      }
      setAllRosterNames(rosterNames);

      const spMatches = (allMatches || []).filter(
        m =>
          m.home_team_name.toUpperCase().includes(SANT_PAU_KEY) ||
          m.away_team_name.toUpperCase().includes(SANT_PAU_KEY)
      ) as MatchInfo[];

      if (spMatches.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setMatches(spMatches);

      const matchIds = spMatches.map(m => m.id);

      const [{ data: players }, { data: events }] = await Promise.all([
        supabase
          .from('match_players')
          .select('match_id, player_name, goals, yellow_cards, red_card, team_side, is_starter')
          .in('match_id', matchIds),
        supabase
          .from('match_events')
          .select('match_id, event_type, details, minute, team_side, player_name')
          .in('match_id', matchIds)
          .order('minute'),
      ]);

      const sideMap: Record<string, string> = {};
      const secondsMap: Record<string, number> = {};
      spMatches.forEach(m => {
        sideMap[m.id] = m.home_team_name.toUpperCase().includes(SANT_PAU_KEY) ? 'home' : 'away';
        secondsMap[m.id] = m.total_seconds;
      });

      const eventsByMatch: Record<string, EventRow[]> = {};
      (events || []).forEach(e => {
        const key = e.match_id;
        if (!eventsByMatch[key]) eventsByMatch[key] = [];
        eventsByMatch[key].push(e as EventRow);
      });

      const accum: Record<string, PlayerAccum> = {};
      (players || []).forEach(p => {
        const santPauSide = sideMap[p.match_id];
        if (p.team_side !== santPauSide) return;

        const matchEvents = (eventsByMatch[p.match_id] || []).filter(
          e => e.team_side === santPauSide
        );

        const minutes = calcMinutesFromDbEvents(
          p.player_name,
          p.is_starter,
          matchEvents,
          secondsMap[p.match_id]
        );

        if (!accum[p.player_name]) accum[p.player_name] = {};
        accum[p.player_name][p.match_id] = {
          minutes_played: minutes,
          goals: p.goals,
          yellow_cards: p.yellow_cards,
          red_card: p.red_card,
        };
      });

      setPlayerData(accum);
      setLoading(false);
    })();
  }, [user]);

  // Merge roster players with match players so all appear
  const playerNames = Array.from(
    new Set([...Object.keys(playerData), ...allRosterNames])
  ).sort((a, b) => a.localeCompare(b));

  const getSummary = (name: string) => {
    const pd = playerData[name];
    if (!pd) return { matches: 0, minutes: 0, goals: 0, yellows: 0, reds: 0 };
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

  const tableRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [];
    // Header
    const header = ['Jugador', ...matches.map(m => {
      const opponent = m.home_team_name.toUpperCase().includes(SANT_PAU_KEY) ? m.away_team_name : m.home_team_name;
      return `${m.match_date || '??'} vs ${opponent}`;
    }), 'Partidos', 'Minutos', 'Goles', 'Amarillas', 'Rojas'];
    rows.push(header);

    playerNames.forEach(name => {
      const summary = getSummary(name);
      const row = [
        name,
        ...matches.map(m => {
          const ps = playerData[name]?.[m.id];
          if (!ps) return '—';
          const parts = [`${ps.minutes_played}'`];
          if (ps.goals > 0) parts.push(`${ps.goals}G`);
          if (ps.yellow_cards > 0) parts.push(`${ps.yellow_cards}A`);
          if (ps.red_card) parts.push('R');
          return parts.join(' ');
        }),
        String(summary.matches),
        String(summary.minutes),
        String(summary.goals),
        String(summary.yellows),
        String(summary.reds),
      ];
      rows.push(row);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sant-pau-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV descargado');
  }, [matches, playerNames, playerData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="max-w-full mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl text-foreground flex-1">
          📊 Estadísticas Sant Pau d'Ordal
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={matches.length === 0}>
            <Save className="h-4 w-4 mr-1" /> Guardar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={matches.length === 0}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="hidden print:block text-center mb-4">
        <h1 className="text-lg font-bold">📊 Estadísticas Sant Pau d'Ordal</h1>
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

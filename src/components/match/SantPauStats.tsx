import { MatchPlayer } from './PlayerRow';
import { MatchEvent } from './EventLog';
import { calcMinutesPlayed } from '@/lib/calcMinutesPlayed';
import { useClub } from '@/hooks/useClub';

const SANT_PAU_NAME = "SANT PAU D'ORDAL, U.E. A";

interface SantPauStatsProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  events: MatchEvent[];
  totalSeconds: number;
}

interface PlayerStats {
  name: string;
  minutes: number;
  goals: number;
  yellows: number;
  reds: number;
}

export default function SantPauStats({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  events,
  totalSeconds,
}: SantPauStatsProps) {
  const { club } = useClub();
  const key = (club?.name_key || "SANT PAU D'ORDAL").toUpperCase();
  const isSantPauHome = homeTeamName.toUpperCase().includes(key);
  const isSantPauAway = awayTeamName.toUpperCase().includes(key);

  if (!isSantPauHome && !isSantPauAway) return null;

  const side: 'home' | 'away' = isSantPauHome ? 'home' : 'away';
  const players = side === 'home' ? homePlayers : awayPlayers;
  const sideEvents = events.filter(e => e.teamSide === side);
  const totalMinutes = Math.min(Math.floor(totalSeconds / 60), 90);

  const stats: PlayerStats[] = players
    .filter(p => p.playerName)
    .map(p => ({
      name: p.playerName,
      minutes: calcMinutesPlayed(p.playerName, p.isStarter, sideEvents, totalSeconds),
      goals: p.goals,
      yellows: (p.yellowCard1 ? 1 : 0) + (p.yellowCard2 ? 1 : 0),
      reds: p.redCard ? 1 : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (stats.length === 0) return null;

  const totals = stats.reduce(
    (acc, s) => ({
      minutes: acc.minutes,
      goals: acc.goals + s.goals,
      yellows: acc.yellows + s.yellows,
      reds: acc.reds + s.reds,
    }),
    { minutes: 0, goals: 0, yellows: 0, reds: 0 }
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-display text-sm text-center mb-3 text-foreground">
        ⚽ ESTADÍSTICAS {(club?.short_name || "Sant Pau d'Ordal").toUpperCase()}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left text-muted-foreground">Jugador</th>
              <th className="p-2 text-center text-muted-foreground">Min</th>
              <th className="p-2 text-center text-muted-foreground">Goles</th>
              <th className="p-2 text-center text-muted-foreground">🟨</th>
              <th className="p-2 text-center text-muted-foreground">🟥</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.name} className="border-b border-border">
                <td className="p-2 text-foreground font-medium">{s.name}</td>
                <td className="p-2 text-center text-foreground">{s.minutes}'</td>
                <td className="p-2 text-center text-foreground font-bold">{s.goals || ''}</td>
                <td className="p-2 text-center text-foreground">{s.yellows || ''}</td>
                <td className="p-2 text-center text-foreground">{s.reds || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td className="p-2 text-foreground">TOTAL</td>
              <td className="p-2 text-center text-foreground">{totalMinutes}'</td>
              <td className="p-2 text-center text-foreground">{totals.goals}</td>
              <td className="p-2 text-center text-foreground">{totals.yellows}</td>
              <td className="p-2 text-center text-foreground">{totals.reds}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

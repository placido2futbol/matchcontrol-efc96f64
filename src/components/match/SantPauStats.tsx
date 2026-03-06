import { MatchPlayer } from './PlayerRow';
import { MatchEvent } from './EventLog';

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
  const isSantPauHome = homeTeamName.toUpperCase().includes("SANT PAU D'ORDAL");
  const isSantPauAway = awayTeamName.toUpperCase().includes("SANT PAU D'ORDAL");

  if (!isSantPauHome && !isSantPauAway) return null;

  const side: 'home' | 'away' = isSantPauHome ? 'home' : 'away';
  const players = side === 'home' ? homePlayers : awayPlayers;
  const totalMinutes = Math.floor(totalSeconds / 60);

  // Calculate minutes per player based on sub events
  const subEvents = events.filter(e => e.type === 'substitution' && e.teamSide === side);

  const calcMinutes = (player: MatchPlayer): number => {
    if (!player.playerName) return 0;
    const name = player.playerName;

    // Check if player was subbed out
    const subbedOutEvent = subEvents.find(e => e.details?.includes(`Sale ${name}`));
    // Check if player was subbed in
    const subbedInEvent = subEvents.find(e => e.details?.includes(`Entra ${name}`));

    if (player.isStarter) {
      if (subbedOutEvent) {
        return Math.floor(subbedOutEvent.minute / 60);
      }
      return totalMinutes;
    } else {
      if (subbedInEvent) {
        const entryMinute = Math.floor(subbedInEvent.minute / 60);
        if (subbedOutEvent) {
          return Math.floor(subbedOutEvent.minute / 60) - entryMinute;
        }
        return totalMinutes - entryMinute;
      }
      return 0;
    }
  };

  const stats: PlayerStats[] = players
    .filter(p => p.playerName)
    .map(p => ({
      name: p.playerName,
      minutes: calcMinutes(p),
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
        ⚽ ESTADÍSTICAS SANT PAU D'ORDAL
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

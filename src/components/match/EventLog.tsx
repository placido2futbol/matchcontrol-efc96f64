export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'second_yellow' | 'red' | 'sub_in' | 'sub_out' | 'substitution';
  teamSide: 'home' | 'away';
  playerName: string;
  details?: string;
}

interface EventLogProps {
  events: MatchEvent[];
}

const typeLabels: Record<string, string> = {
  goal: '⚽ Gol',
  yellow: '🟨 Amarilla',
  second_yellow: '🟨🟨 2ª Amarilla',
  red: '🟥 Roja',
  sub_in: '🔄 Entra',
  sub_out: '🔄 Sale',
  substitution: '🔄 Cambio',
};

export default function EventLog({ events }: EventLogProps) {
  if (events.length === 0) return null;

  return (
    <div className="match-card mt-4">
      <h3 className="font-display text-sm mb-2 text-foreground">Registro de Eventos</h3>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {events.map((ev, i) => (
          <div key={i} className="flex gap-2 text-xs border-b border-border py-1">
            <span className="font-mono text-muted-foreground w-10">
              {String(Math.floor(ev.minute / 60)).padStart(2, '0')}:{String(ev.minute % 60).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground">{ev.teamSide === 'home' ? 'Local' : 'Visitante'}</span>
            <span>{typeLabels[ev.type] || ev.type}</span>
            <span className="font-medium text-foreground">{ev.playerName}</span>
            {ev.details && <span className="text-muted-foreground">({ev.details})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

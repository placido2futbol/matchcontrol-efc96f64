import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'second_yellow' | 'red' | 'sub_in' | 'sub_out' | 'substitution';
  teamSide: 'home' | 'away';
  playerName: string;
  details?: string;
}

interface EventLogProps {
  events: MatchEvent[];
  onDeleteEvent?: (index: number) => void;
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

export default function EventLog({ events, onDeleteEvent }: EventLogProps) {
  if (events.length === 0) return null;

  return (
    <div className="match-card mt-4">
      <h3 className="font-display text-sm mb-2 text-foreground">Registro de Eventos</h3>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {events.map((ev, i) => (
          <div key={i} className="flex items-center gap-2 text-xs border-b border-border py-1 group">
            <span className="font-mono text-muted-foreground w-10">
              {String(Math.floor(ev.minute / 60)).padStart(2, '0')}:{String(ev.minute % 60).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground">{ev.teamSide === 'home' ? 'Local' : 'Visitante'}</span>
            <span>{typeLabels[ev.type] || ev.type}</span>
            <span className="font-medium text-foreground">{ev.playerName}</span>
            {ev.details && <span className="text-muted-foreground">({ev.details})</span>}
            {onDeleteEvent && (
              <Button
                size="xs"
                variant="ghost"
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-5 w-5 p-0"
                onClick={() => onDeleteEvent(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { TacticalPlayer, TEAM_COLORS } from './types';
import { Button } from '@/components/ui/button';
import { Plus, UserMinus } from 'lucide-react';

interface BenchPanelProps {
  players: TacticalPlayer[];
  onAddPlayer: () => void;
  onMoveToField: (id: string) => void;
  onRemovePlayer: (id: string) => void;
}

export default function BenchPanel({ players, onAddPlayer, onMoveToField, onRemovePlayer }: BenchPanelProps) {
  const benchPlayers = players.filter(p => !p.onField);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Banquillo ({benchPlayers.length})</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddPlayer} title="Añadir jugador">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {benchPlayers.map(p => {
          const colors = TEAM_COLORS[p.team];
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
              onClick={() => onMoveToField(p.id)}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: colors.bg, color: colors.text, border: `2px solid ${colors.border}` }}
              >
                {p.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                <p className="text-[9px] text-muted-foreground">{p.position}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={(e) => { e.stopPropagation(); onRemovePlayer(p.id); }}
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
        {benchPlayers.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No hay suplentes</p>
        )}
      </div>
    </div>
  );
}

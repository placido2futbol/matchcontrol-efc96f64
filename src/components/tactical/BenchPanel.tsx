import { TacticalPlayer, PLAYER_COLORS } from './types';
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
        {benchPlayers.map(p => (
          <div
            key={p.id}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
            onClick={() => onMoveToField(p.id)}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-sm"
              style={{ background: p.color, color: isLight(p.color) ? '#1a1a2e' : '#fff', border: `2px solid rgba(0,0,0,0.2)` }}
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
        ))}
        {benchPlayers.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No hay suplentes</p>
        )}
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

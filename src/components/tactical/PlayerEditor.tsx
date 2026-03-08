import { useState, useEffect } from 'react';
import { TacticalPlayer } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Copy, UserMinus, ArrowDownToLine } from 'lucide-react';

interface PlayerEditorProps {
  player: TacticalPlayer;
  onUpdate: (player: TacticalPlayer) => void;
  onDuplicate: (player: TacticalPlayer) => void;
  onRemove: (id: string) => void;
  onMoveToBench: (id: string) => void;
  onClose: () => void;
}

export default function PlayerEditor({ player, onUpdate, onDuplicate, onRemove, onMoveToBench, onClose }: PlayerEditorProps) {
  const [name, setName] = useState(player.name);
  const [number, setNumber] = useState(player.number.toString());
  const [position, setPosition] = useState(player.position);
  const [team, setTeam] = useState(player.team);

  useEffect(() => {
    setName(player.name);
    setNumber(player.number.toString());
    setPosition(player.position);
    setTeam(player.team);
  }, [player]);

  const save = () => {
    onUpdate({ ...player, name, number: parseInt(number) || 0, position, team });
  };

  return (
    <div className="absolute top-2 right-2 z-50 w-56 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2 animate-scale-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Editar Jugador</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input value={name} onChange={e => setName(e.target.value)} onBlur={save} placeholder="Nombre" className="h-7 text-xs" />
      
      <div className="flex gap-1.5">
        <Input value={number} onChange={e => setNumber(e.target.value)} onBlur={save} placeholder="#" className="h-7 text-xs w-14" type="number" />
        <Input value={position} onChange={e => setPosition(e.target.value)} onBlur={save} placeholder="Pos" className="h-7 text-xs flex-1" />
      </div>

      <div className="flex gap-1">
        {(['home', 'away', 'neutral'] as const).map(t => (
          <button
            key={t}
            className={`flex-1 h-6 rounded text-[9px] font-bold transition-all ${team === t ? 'ring-2 ring-ring scale-105' : 'opacity-60'}`}
            style={{
              background: t === 'home' ? 'hsl(145, 63%, 32%)' : t === 'away' ? 'hsl(0, 72%, 51%)' : 'hsl(38, 92%, 50%)',
              color: '#fff',
            }}
            onClick={() => { setTeam(t); onUpdate({ ...player, name, number: parseInt(number) || 0, position, team: t }); }}
          >
            {t === 'home' ? 'Local' : t === 'away' ? 'Rival' : 'Neutro'}
          </button>
        ))}
      </div>

      <div className="flex gap-1 pt-1 border-t border-border">
        <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={() => onDuplicate(player)}>
          <Copy className="h-3 w-3 mr-1" /> Duplicar
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={() => onMoveToBench(player.id)}>
          <ArrowDownToLine className="h-3 w-3 mr-1" /> Banco
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => onRemove(player.id)}>
          <UserMinus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { TacticalPlayer, PLAYER_COLORS } from './types';
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
  const [color, setColor] = useState(player.color);

  useEffect(() => {
    setName(player.name);
    setNumber(player.number.toString());
    setPosition(player.position);
    setColor(player.color);
  }, [player]);

  const save = () => {
    onUpdate({ ...player, name, number: parseInt(number) || 0, position, color });
  };

  const setColorAndSave = (c: string) => {
    setColor(c);
    onUpdate({ ...player, name, number: parseInt(number) || 0, position, color: c });
  };

  return (
    <div className="absolute top-2 right-2 z-50 w-60 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2.5 animate-scale-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Editar Jugador</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input value={name} onChange={e => setName(e.target.value)} onBlur={save} placeholder="Nombre" className="h-8 text-xs" />
      
      <div className="flex gap-1.5">
        <Input value={number} onChange={e => setNumber(e.target.value)} onBlur={save} placeholder="#" className="h-8 text-xs w-16" type="number" />
        <Input value={position} onChange={e => setPosition(e.target.value)} onBlur={save} placeholder="Pos" className="h-8 text-xs flex-1" />
      </div>

      {/* Color picker */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Color</span>
        <div className="flex flex-wrap gap-1.5">
          {PLAYER_COLORS.map(c => (
            <button
              key={c}
              className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
              style={{
                background: c,
                borderColor: color === c ? '#fff' : 'rgba(0,0,0,0.2)',
                boxShadow: color === c ? '0 0 0 2px hsl(145, 63%, 32%)' : 'none',
              }}
              onClick={() => setColorAndSave(c)}
            />
          ))}
          {/* Custom color input */}
          <label className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer flex items-center justify-center overflow-hidden relative hover:scale-110 transition-all"
            title="Color personalizado"
          >
            <span className="text-[8px] text-muted-foreground">+</span>
            <input
              type="color"
              value={color}
              onChange={e => setColorAndSave(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="flex gap-1 pt-1.5 border-t border-border">
        <Button variant="ghost" size="sm" className="h-7 text-[10px] flex-1" onClick={() => onDuplicate(player)}>
          <Copy className="h-3 w-3 mr-1" /> Duplicar
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] flex-1" onClick={() => onMoveToBench(player.id)}>
          <ArrowDownToLine className="h-3 w-3 mr-1" /> Banco
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={() => onRemove(player.id)}>
          <UserMinus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

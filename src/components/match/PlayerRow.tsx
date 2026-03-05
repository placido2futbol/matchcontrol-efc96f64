import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export interface MatchPlayer {
  slotIndex: number;
  playerName: string;
  goals: number;
  yellowCard1: boolean;
  yellowCard2: boolean;
  redCard: boolean;
  isStarter: boolean;
  subIn: boolean;
  subOut: boolean;
}

interface PlayerRowProps {
  player: MatchPlayer;
  availablePlayers: string[];
  selectedPlayers: string[];
  teamSide: 'home' | 'away';
  onSelectPlayer: (slotIndex: number, playerName: string) => void;
  onGoal: (slotIndex: number, delta: number) => void;
  onYellowCard1: (slotIndex: number, checked: boolean) => void;
  onYellowCard2: (slotIndex: number, checked: boolean) => void;
  onRedCard: (slotIndex: number, checked: boolean) => void;
  onSub: (slotIndex: number, type: 'in' | 'out') => void;
  pendingSub: boolean;
}

export default function PlayerRow({
  player,
  availablePlayers,
  selectedPlayers,
  onSelectPlayer,
  onGoal,
  onYellowCard1,
  onYellowCard2,
  onRedCard,
  onSub,
  pendingSub,
}: PlayerRowProps) {
  return (
    <tr className={`border-b border-border ${pendingSub ? 'ring-2 ring-warning rounded' : ''}`}>
      <td className="p-1">
        <Select
          value={player.playerName || '__none__'}
          onValueChange={(v) => onSelectPlayer(player.slotIndex, v === '__none__' ? '' : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">-- Selecciona --</SelectItem>
            {availablePlayers.map(p => (
              <SelectItem
                key={p}
                value={p}
                disabled={selectedPlayers.includes(p) && p !== player.playerName}
              >
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-1 text-center">
        <Checkbox
          checked={player.yellowCard1}
          onCheckedChange={(v) => onYellowCard1(player.slotIndex, !!v)}
        />
      </td>
      <td className="p-1 text-center">
        <Checkbox
          checked={player.yellowCard2}
          onCheckedChange={(v) => onYellowCard2(player.slotIndex, !!v)}
        />
      </td>
      <td className="p-1 text-center">
        <Checkbox
          checked={player.redCard}
          onCheckedChange={(v) => onRedCard(player.slotIndex, !!v)}
        />
      </td>
      <td className="p-1">
        <div className="flex items-center justify-center gap-1">
          <Button size="xs" variant="destructive" onClick={() => onGoal(player.slotIndex, -1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="px-2 text-sm font-bold text-foreground">{player.goals}</span>
          <Button size="xs" variant="success" onClick={() => onGoal(player.slotIndex, 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="p-1">
        <div className="flex gap-1">
          <Button size="xs" variant="success" onClick={() => onSub(player.slotIndex, 'in')}>
            <ArrowDownToLine className="h-3 w-3" />
          </Button>
          <Button size="xs" variant="warning" onClick={() => onSub(player.slotIndex, 'out')}>
            <ArrowUpFromLine className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

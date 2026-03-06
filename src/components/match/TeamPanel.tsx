import PlayerRow, { MatchPlayer } from './PlayerRow';

const SANT_PAU_PATTERN = /SANT PAU D'ORDAL/i;

interface TeamPanelProps {
  title: string;
  teamSide: 'home' | 'away';
  starters: MatchPlayer[];
  subs: MatchPlayer[];
  availablePlayers: string[];
  selectedPlayers: string[];
  pendingSubSlot: number | null;
  onSelectPlayer: (slotIndex: number, playerName: string) => void;
  onDorsalChange: (slotIndex: number, dorsal: string) => void;
  onGoal: (slotIndex: number, delta: number) => void;
  onYellowCard1: (slotIndex: number, checked: boolean) => void;
  onYellowCard2: (slotIndex: number, checked: boolean) => void;
  onRedCard: (slotIndex: number, checked: boolean) => void;
  onSub: (slotIndex: number, type: 'in' | 'out') => void;
}

export default function TeamPanel({
  title,
  teamSide,
  starters,
  subs,
  availablePlayers,
  selectedPlayers,
  pendingSubSlot,
  onSelectPlayer,
  onDorsalChange,
  onGoal,
  onYellowCard1,
  onYellowCard2,
  onRedCard,
  onSub,
}: TeamPanelProps) {
  const isSantPau = SANT_PAU_PATTERN.test(title);
  const showDorsal = !isSantPau;

  const renderTable = (players: MatchPlayer[], label: string) => (
    <div className="mb-4">
      <h4 className="font-bold text-sm mb-1 text-foreground">{label}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="p-1 text-left text-muted-foreground">Jugador</th>
              {showDorsal && <th className="p-1 text-center text-muted-foreground">Nº</th>}
              <th className="p-1 text-center text-muted-foreground">TG1</th>
              <th className="p-1 text-center text-muted-foreground">TG2</th>
              <th className="p-1 text-center text-muted-foreground">TR</th>
              <th className="p-1 text-center text-muted-foreground">Goles</th>
              <th className="p-1 text-center text-muted-foreground">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <PlayerRow
                key={p.slotIndex}
                player={p}
                availablePlayers={availablePlayers}
                selectedPlayers={selectedPlayers}
                teamSide={teamSide}
                pendingSub={pendingSubSlot === p.slotIndex}
                showDorsal={showDorsal}
                onSelectPlayer={onSelectPlayer}
                onDorsalChange={onDorsalChange}
                onGoal={onGoal}
                onYellowCard1={onYellowCard1}
                onYellowCard2={onYellowCard2}
                onRedCard={onRedCard}
                onSub={onSub}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-sm font-display text-center mb-2 text-foreground">{title}</h3>
      {renderTable(starters, 'Titulares')}
      {renderTable(subs, 'Suplentes')}
    </div>
  );
}

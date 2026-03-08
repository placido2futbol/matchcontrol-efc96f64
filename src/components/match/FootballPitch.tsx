import { useState, useRef, useCallback, useEffect } from 'react';
import { MatchPlayer } from './PlayerRow';

export interface PlayerPosition {
  slotIndex: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

interface FootballPitchProps {
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
  positions: PlayerPosition[];
  onPositionsChange?: (positions: PlayerPosition[]) => void;
  readOnly?: boolean;
}

const DEFAULT_HOME_POSITIONS: { x: number; y: number }[] = [
  // GK
  { x: 8, y: 50 },
  // Defenders (4)
  { x: 22, y: 15 }, { x: 22, y: 38 }, { x: 22, y: 62 }, { x: 22, y: 85 },
  // Midfielders (4)
  { x: 42, y: 20 }, { x: 42, y: 40 }, { x: 42, y: 60 }, { x: 42, y: 80 },
  // Forwards (2)
  { x: 58, y: 35 }, { x: 58, y: 65 },
];

const DEFAULT_AWAY_POSITIONS: { x: number; y: number }[] = [
  // GK
  { x: 92, y: 50 },
  // Defenders (4)
  { x: 78, y: 15 }, { x: 78, y: 38 }, { x: 78, y: 62 }, { x: 78, y: 85 },
  // Midfielders (4)
  { x: 58, y: 20 }, { x: 58, y: 40 }, { x: 58, y: 60 }, { x: 58, y: 80 },
  // Forwards (2)
  { x: 42, y: 35 }, { x: 42, y: 65 },
];

export function getDefaultPositions(homePlayers: MatchPlayer[], awayPlayers: MatchPlayer[]): PlayerPosition[] {
  const positions: PlayerPosition[] = [];
  const homeStarters = homePlayers.filter(p => p.isStarter && p.playerName);
  const awayStarters = awayPlayers.filter(p => p.isStarter && p.playerName);

  homeStarters.forEach((p, i) => {
    const def = DEFAULT_HOME_POSITIONS[i] || { x: 30, y: 50 };
    positions.push({ slotIndex: p.slotIndex, x: def.x, y: def.y });
  });

  awayStarters.forEach((p, i) => {
    const def = DEFAULT_AWAY_POSITIONS[i] || { x: 70, y: 50 };
    positions.push({ slotIndex: p.slotIndex, x: def.x, y: def.y });
  });

  return positions;
}

function PlayerDot({
  player,
  position,
  isHome,
  onDragStart,
  readOnly,
}: {
  player: MatchPlayer;
  position: { x: number; y: number };
  isHome: boolean;
  onDragStart?: (slotIndex: number, e: React.PointerEvent) => void;
  readOnly?: boolean;
}) {
  const displayName = player.playerName.length > 10
    ? player.playerName.substring(0, 10) + '.'
    : player.playerName;

  return (
    <div
      className={`absolute flex flex-col items-center gap-0 select-none ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        touchAction: 'none',
      }}
      onPointerDown={!readOnly && onDragStart ? (e) => onDragStart(player.slotIndex, e) : undefined}
    >
      {/* Circle with photo or dorsal */}
      <div
        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg border-2 overflow-hidden ${
          isHome
            ? 'bg-destructive text-destructive-foreground border-destructive-foreground/30'
            : 'bg-accent text-accent-foreground border-accent-foreground/30'
        }`}
      >
        {player.photoUrl ? (
          <img src={player.photoUrl} alt={player.playerName} className="w-full h-full object-cover" />
        ) : (
          player.dorsal || (player.slotIndex % 100) + 1
        )}
      </div>
      {/* Name */}
      <span className="text-[8px] sm:text-[10px] font-semibold text-white whitespace-nowrap mt-0.5 px-1 py-0 rounded bg-black/60 leading-tight">
        {displayName}
      </span>
      {/* Goal/card indicators */}
      <div className="flex gap-0.5 mt-0">
        {player.goals > 0 && <span className="text-[8px]">⚽{player.goals > 1 ? player.goals : ''}</span>}
        {player.yellowCard1 && <span className="text-[8px]">🟨</span>}
        {player.yellowCard2 && <span className="text-[8px]">🟨</span>}
        {player.redCard && <span className="text-[8px]">🟥</span>}
      </div>
    </div>
  );
}

export default function FootballPitch({
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  homeTeamCrest,
  awayTeamCrest,
  positions,
  onPositionsChange,
  readOnly = false,
}: FootballPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const homeStarters = homePlayers.filter(p => p.isStarter && p.playerName);
  const awayStarters = awayPlayers.filter(p => p.isStarter && p.playerName);
  const homeSubs = homePlayers.filter(p => !p.isStarter && p.playerName);
  const awaySubs = awayPlayers.filter(p => !p.isStarter && p.playerName);

  const getPos = (slotIndex: number) => {
    return positions.find(p => p.slotIndex === slotIndex) || { x: 50, y: 50 };
  };

  const handleDragStart = useCallback((slotIndex: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(slotIndex);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !pitchRef.current || !onPositionsChange) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    const newPositions = positions.map(p =>
      p.slotIndex === dragging ? { ...p, x, y } : p
    );
    // If the position doesn't exist yet, add it
    if (!positions.find(p => p.slotIndex === dragging)) {
      newPositions.push({ slotIndex: dragging, x, y });
    }
    onPositionsChange(newPositions);
  }, [dragging, positions, onPositionsChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm text-center text-foreground uppercase tracking-wider">
        Alineaciones
      </h3>

      <div className="flex gap-1 sm:gap-2">
        {/* Home Subs */}
        <div className="w-16 sm:w-20 shrink-0 space-y-1">
          <div className="text-center">
            {homeTeamCrest && <img src={homeTeamCrest} alt={homeTeamName} className="w-6 h-6 sm:w-8 sm:h-8 mx-auto object-contain" />}
            <p className="text-[9px] sm:text-[10px] font-bold text-foreground truncate">{homeTeamName}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Suplentes</p>
          </div>
          {homeSubs.map((p, i) => (
            <div key={p.slotIndex} className="flex items-center gap-1 text-[8px] sm:text-[9px]">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[7px] sm:text-[8px] font-bold shrink-0">
                {p.dorsal || (p.slotIndex % 100) + 1}
              </span>
              <span className="text-foreground truncate">{p.playerName}</span>
            </div>
          ))}
        </div>

        {/* Pitch */}
        <div
          ref={pitchRef}
          className="flex-1 relative rounded-lg overflow-hidden select-none"
          style={{
            aspectRatio: '16/10',
            background: 'linear-gradient(180deg, hsl(145 60% 28%) 0%, hsl(145 55% 22%) 100%)',
            touchAction: 'none',
          }}
          onPointerMove={!readOnly ? handlePointerMove : undefined}
          onPointerUp={!readOnly ? handlePointerUp : undefined}
          onPointerLeave={!readOnly ? handlePointerUp : undefined}
        >
          {/* Pitch markings */}
          <svg viewBox="0 0 1000 625" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Outline */}
            <rect x="30" y="20" width="940" height="585" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            {/* Center line */}
            <line x1="500" y1="20" x2="500" y2="605" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            {/* Center circle */}
            <circle cx="500" cy="312" r="80" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            <circle cx="500" cy="312" r="4" fill="white" fillOpacity="0.5" />
            {/* Left penalty area */}
            <rect x="30" y="150" width="140" height="325" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            <rect x="30" y="220" width="50" height="185" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            {/* Right penalty area */}
            <rect x="830" y="150" width="140" height="325" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            <rect x="920" y="220" width="50" height="185" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            {/* Penalty spots */}
            <circle cx="140" cy="312" r="4" fill="white" fillOpacity="0.5" />
            <circle cx="860" cy="312" r="4" fill="white" fillOpacity="0.5" />
          </svg>

          {/* Grass stripes */}
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(90deg, transparent, transparent 9.09%, rgba(255,255,255,0.03) 9.09%, rgba(255,255,255,0.03) 18.18%)',
          }} />

          {/* Players */}
          {homeStarters.map(p => (
            <PlayerDot
              key={p.slotIndex}
              player={p}
              position={getPos(p.slotIndex)}
              isHome={true}
              onDragStart={handleDragStart}
              readOnly={readOnly}
            />
          ))}
          {awayStarters.map(p => (
            <PlayerDot
              key={p.slotIndex}
              player={p}
              position={getPos(p.slotIndex)}
              isHome={false}
              onDragStart={handleDragStart}
              readOnly={readOnly}
            />
          ))}
        </div>

        {/* Away Subs */}
        <div className="w-16 sm:w-20 shrink-0 space-y-1">
          <div className="text-center">
            {awayTeamCrest && <img src={awayTeamCrest} alt={awayTeamName} className="w-6 h-6 sm:w-8 sm:h-8 mx-auto object-contain" />}
            <p className="text-[9px] sm:text-[10px] font-bold text-foreground truncate">{awayTeamName}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Suplentes</p>
          </div>
          {awaySubs.map((p, i) => (
            <div key={p.slotIndex} className="flex items-center gap-1 text-[8px] sm:text-[9px]">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[7px] sm:text-[8px] font-bold shrink-0">
                {p.dorsal || (p.slotIndex % 100) + 1}
              </span>
              <span className="text-foreground truncate">{p.playerName}</span>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <p className="text-[10px] text-muted-foreground text-center">
          Arrastra los jugadores para colocarlos en formación
        </p>
      )}
    </div>
  );
}

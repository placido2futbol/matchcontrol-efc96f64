import { useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  pitchSlots: (number | null)[];
  players: { player_name: string; dorsal: string; photo_url: string; status: string }[];
  formationPositions: { x: number; y: number }[];
  getSlotPosition: (slotIdx: number) => { x: number; y: number };
  selectedSlot: number | null;
  setSelectedSlot: (s: number | null) => void;
  dragOffset: { slot: number; dx: number; dy: number } | null;
  draggingSlot: React.MutableRefObject<number | null>;
  onTokenPointerDown: (e: React.PointerEvent, slotIdx: number, pitchRef: React.RefObject<HTMLDivElement>) => void;
  onTokenPointerMove: (e: React.PointerEvent, pitchRef: React.RefObject<HTMLDivElement>) => void;
  onTokenPointerUp: (e: React.PointerEvent, pitchRef: React.RefObject<HTMLDivElement>) => void;
  pitchRef: React.RefObject<HTMLDivElement>;
}

export default function CallupPitch({
  pitchSlots, players, formationPositions, getSlotPosition,
  selectedSlot, setSelectedSlot, dragOffset, draggingSlot,
  onTokenPointerDown, onTokenPointerMove, onTokenPointerUp, pitchRef,
}: Props) {
  const isMobile = useIsMobile();

  return (
    <div
      ref={pitchRef}
      className="relative w-full h-full rounded-xl overflow-hidden select-none touch-none"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.45) 8.33%, hsl(var(--primary) / 0.38) 8.33%, hsl(var(--primary) / 0.45) 16.66%, hsl(var(--primary) / 0.35) 16.66%, hsl(var(--primary) / 0.45) 25%, hsl(var(--primary) / 0.38) 25%, hsl(var(--primary) / 0.45) 33.33%, hsl(var(--primary) / 0.35) 33.33%, hsl(var(--primary) / 0.45) 41.66%, hsl(var(--primary) / 0.38) 41.66%, hsl(var(--primary) / 0.45) 50%, hsl(var(--primary) / 0.35) 50%, hsl(var(--primary) / 0.45) 58.33%, hsl(var(--primary) / 0.38) 58.33%, hsl(var(--primary) / 0.45) 66.66%, hsl(var(--primary) / 0.35) 66.66%, hsl(var(--primary) / 0.45) 75%, hsl(var(--primary) / 0.38) 75%, hsl(var(--primary) / 0.45) 83.33%, hsl(var(--primary) / 0.35) 83.33%, hsl(var(--primary) / 0.45) 91.66%, hsl(var(--primary) / 0.38) 91.66%, hsl(var(--primary) / 0.45) 100%)',
        backgroundColor: 'hsl(145, 50%, 25%)',
      }}
      onClick={() => setSelectedSlot(null)}
    >
      {/* Pitch markings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="none">
        <rect x="5" y="4" width="90" height="122" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
        <line x1="5" y1="65" x2="95" y2="65" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="65" r="10" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="65" r="0.6" fill="rgba(255,255,255,0.45)" />
        <rect x="22" y="4" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="34" y="4" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="17" r="0.6" fill="rgba(255,255,255,0.45)" />
        <path d="M 36 24 A 8 8 0 0 0 64 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="40" y="1" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" rx="0.5" />
        <rect x="22" y="106" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="34" y="119" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="113" r="0.6" fill="rgba(255,255,255,0.45)" />
        <path d="M 36 106 A 8 8 0 0 1 64 106" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="40" y="126" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" rx="0.5" />
        <path d="M 5 7 A 3 3 0 0 1 8 4" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 92 4 A 3 3 0 0 1 95 7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 8 126 A 3 3 0 0 1 5 123" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 95 123 A 3 3 0 0 1 92 126" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
      </svg>

      {formationPositions.map((_defaultPos, slotIdx) => {
        const playerIdx = pitchSlots[slotIdx];
        const player = playerIdx !== null ? players[playerIdx] : null;
        const isSelected = selectedSlot === slotIdx;
        const pos = getSlotPosition(slotIdx);

        let displayX = pos.x;
        let displayY = pos.y;
        if (dragOffset && dragOffset.slot === slotIdx) {
          displayX = Math.max(5, Math.min(95, pos.x + dragOffset.dx));
          displayY = Math.max(5, Math.min(95, pos.y + dragOffset.dy));
        }

        return (
          <div
            key={slotIdx}
            className={`absolute flex flex-col items-center ${player ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            style={{
              left: `${displayX}%`,
              top: `${(displayY / 100) * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: (dragOffset?.slot === slotIdx) ? 50 : isSelected ? 20 : 10,
              transition: (dragOffset?.slot === slotIdx) ? 'none' : 'left 0.3s ease, top 0.3s ease',
            }}
            onPointerDown={(e) => { if (player) onTokenPointerDown(e, slotIdx, pitchRef); }}
            onPointerMove={(e) => onTokenPointerMove(e, pitchRef)}
            onPointerUp={(e) => {
              if (draggingSlot.current !== null) {
                onTokenPointerUp(e, pitchRef);
              } else if (!player) {
                e.stopPropagation();
                setSelectedSlot(isSelected ? null : slotIdx);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!player && draggingSlot.current === null) setSelectedSlot(isSelected ? null : slotIdx);
            }}
          >
            {player ? (
              <>
                <div
                  className="relative rounded-full border-[2.5px] border-primary-foreground/90 shadow-lg flex items-center justify-center text-primary-foreground font-black overflow-hidden"
                  style={{
                    width: isMobile ? 38 : 46,
                    height: isMobile ? 38 : 46,
                    background: 'linear-gradient(160deg, hsl(var(--accent)) 0%, hsl(var(--destructive)) 45%, hsl(var(--accent)) 100%)',
                    fontSize: isMobile ? 15 : 19,
                    boxShadow: '0 3px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  {player.photo_url ? (
                    <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="drop-shadow-md">{player.dorsal || '?'}</span>
                  )}
                </div>
                <span
                  className="text-primary-foreground font-black text-center leading-tight drop-shadow-lg uppercase tracking-wide mt-0.5"
                  style={{ fontSize: isMobile ? 8 : 10, maxWidth: isMobile ? 54 : 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {player.player_name.split(' ').pop()}
                </span>
              </>
            ) : (
              <div
                className={`rounded-full border-2 border-dashed flex items-center justify-center font-bold transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/30 scale-110 shadow-lg shadow-accent/30 text-accent-foreground'
                    : 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground/60'
                }`}
                style={{ width: isMobile ? 34 : 42, height: isMobile ? 34 : 42, fontSize: isMobile ? 16 : 20 }}
              >
                +
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
        <p className="text-[8px] sm:text-[9px] text-primary-foreground/40 font-medium">
          {selectedSlot !== null
            ? '👆 Selecciona un jugador del panel'
            : 'Toca una posición vacía · Arrastra jugadores para moverlos'}
        </p>
      </div>
    </div>
  );
}

import { useRef } from 'react';
import { TacticalPlayer } from './types';

interface PlayerTokenProps {
  player: TacticalPlayer;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (player: TacticalPlayer) => void;
  isSelected: boolean;
  animating?: boolean;
  overridePos?: { x: number; y: number };
}

export default function PlayerToken({ player, containerRef, onDragEnd, onClick, isSelected, animating, overridePos }: PlayerTokenProps) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startPlayerPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    startPlayerPos.current = { x: player.x, y: player.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current || !containerRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    if (isDragging.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const newX = Math.max(4, Math.min(96, startPlayerPos.current.x + (dx / rect.width) * 100));
      const newY = Math.max(4, Math.min(96, startPlayerPos.current.y + (dy / rect.height) * 100));
      onDragEnd(player.id, Math.round(newX), Math.round(newY));
    } else {
      onClick(player);
    }
    isDragging.current = false;
  };

  const isLightColor = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  };

  const textColor = isLightColor(player.color) ? '#1a1a2e' : '#ffffff';
  const borderColor = isSelected ? '#ffffff' : darkenColor(player.color, 30);
  const displayX = Math.max(4, Math.min(96, overridePos?.x ?? player.x));
  const displayY = Math.max(4, Math.min(96, overridePos?.y ?? player.y));

  return (
    <div
      onPointerDown={animating ? undefined : handlePointerDown}
      onPointerMove={animating ? undefined : handlePointerMove}
      onPointerUp={animating ? undefined : handlePointerUp}
      className={`absolute flex flex-col items-center select-none touch-none ${animating ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: `${displayX}%`,
        top: `${displayY}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 30 : 20,
        transition: animating ? 'left 1s ease-in-out, top 1s ease-in-out' : undefined,
      }}
    >
      <div
        className="relative flex items-center justify-center rounded-full transition-shadow"
        style={{
          width: 40,
          height: 40,
          background: player.color,
          color: textColor,
          border: `3px solid ${borderColor}`,
          boxShadow: isSelected
            ? '0 0 0 3px rgba(255,255,255,0.7), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 3px 10px rgba(0,0,0,0.35)',
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        {player.number}
      </div>
      <div
        className="mt-0.5 px-2 py-px font-bold whitespace-nowrap"
        style={{
          background: 'rgba(255,255,255,0.92)',
          color: '#cc0000',
          fontSize: 11,
          lineHeight: '14px',
          border: '1px solid rgba(0,0,0,0.15)',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {player.name.length > 12 ? player.name.substring(0, 12) + '.' : player.name.toUpperCase()}
      </div>
    </div>
  );
}

function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

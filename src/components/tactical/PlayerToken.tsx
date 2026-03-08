import { motion } from 'framer-motion';
import { TacticalPlayer, TEAM_COLORS } from './types';

interface PlayerTokenProps {
  player: TacticalPlayer;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (player: TacticalPlayer) => void;
  isSelected: boolean;
}

export default function PlayerToken({ player, containerRef, onDragEnd, onClick, isSelected }: PlayerTokenProps) {
  const colors = TEAM_COLORS[player.team];

  const handleDragEnd = (_: any, info: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((info.point.x - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((info.point.y - rect.top) / rect.height) * 100));
    // Snap to grid (2% increments)
    const snappedX = Math.round(x / 2) * 2;
    const snappedY = Math.round(y / 2) * 2;
    onDragEnd(player.id, snappedX, snappedY);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); onClick(player); }}
      className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
      style={{
        left: `${player.x}%`,
        top: `${player.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 30 : 20,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className="relative flex items-center justify-center rounded-full shadow-lg transition-shadow"
        style={{
          width: 36,
          height: 36,
          background: colors.bg,
          color: colors.text,
          border: `2.5px solid ${isSelected ? '#fff' : colors.border}`,
          boxShadow: isSelected ? '0 0 0 3px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <span className="text-xs font-bold leading-none">{player.number}</span>
      </div>
      <span
        className="mt-0.5 px-1.5 py-px rounded text-[9px] font-semibold leading-tight whitespace-nowrap"
        style={{
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {player.name.length > 10 ? player.name.substring(0, 10) + '.' : player.name}
      </span>
    </motion.div>
  );
}

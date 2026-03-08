import { motion } from 'framer-motion';
import { TacticalPlayer } from './types';

interface PlayerTokenProps {
  player: TacticalPlayer;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (player: TacticalPlayer) => void;
  isSelected: boolean;
}

export default function PlayerToken({ player, containerRef, onDragEnd, onClick, isSelected }: PlayerTokenProps) {
  const handleDragEnd = (_: any, info: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((info.point.x - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((info.point.y - rect.top) / rect.height) * 100));
    const snappedX = Math.round(x / 2) * 2;
    const snappedY = Math.round(y / 2) * 2;
    onDragEnd(player.id, snappedX, snappedY);
  };

  // Determine if color is light to use dark text
  const isLightColor = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  };

  const textColor = isLightColor(player.color) ? '#1a1a2e' : '#ffffff';
  const borderColor = isSelected ? '#ffffff' : darkenColor(player.color, 30);

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
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Circle */}
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
      {/* Name label */}
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
    </motion.div>
  );
}

function darkenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

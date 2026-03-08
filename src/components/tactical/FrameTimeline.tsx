import { Button } from '@/components/ui/button';
import { Camera, Trash2, Play, Square, Gauge } from 'lucide-react';
import { AnimationFrame } from './types';

interface FrameTimelineProps {
  frames: AnimationFrame[];
  onCaptureFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onPreview: () => void;
  onStop: () => void;
  isPlaying: boolean;
  activeFrameIndex: number | null;
  onSelectFrame: (index: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [
  { label: '0.5x', value: 3000 },
  { label: '1x', value: 1500 },
  { label: '1.5x', value: 1000 },
  { label: '2x', value: 750 },
];

export default function FrameTimeline({
  frames, onCaptureFrame, onDeleteFrame, onPreview, onStop,
  isPlaying, activeFrameIndex, onSelectFrame, speed, onSpeedChange,
}: FrameTimelineProps) {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-xl shadow-md shrink-0">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Frames</span>

      {/* Frame indicators */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[300px]">
        {frames.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelectFrame(i)}
            className={`w-7 h-7 rounded-md text-[10px] font-bold border transition-all shrink-0 ${
              activeFrameIndex === i
                ? 'bg-primary text-primary-foreground border-primary scale-110'
                : 'bg-muted text-foreground border-border hover:bg-accent'
            }`}
          >
            {i + 1}
          </button>
        ))}
        {frames.length === 0 && (
          <span className="text-[10px] text-muted-foreground italic">Sin frames</span>
        )}
      </div>

      {/* Capture frame */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[10px] gap-1 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/20"
        onClick={onCaptureFrame}
        title="Capturar frame actual"
      >
        <Camera className="h-3.5 w-3.5" />
        Capturar
      </Button>

      {/* Delete frame */}
      {frames.length > 0 && activeFrameIndex !== null && (
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
          onClick={() => onDeleteFrame(activeFrameIndex)}
          title="Eliminar frame"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Play/Stop + Speed */}
      {frames.length >= 2 && (
        <>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 text-[10px] gap-1 ${isPlaying
              ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-300'
              : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
            }`}
            onClick={isPlaying ? onStop : onPreview}
            title={isPlaying ? 'Parar' : 'Reproducir animación'}
          >
            {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? 'Parar' : 'Play'}
          </Button>

          <div className="flex items-center gap-0.5">
            <Gauge className="h-3 w-3 text-muted-foreground" />
            {SPEEDS.map(s => (
              <button
                key={s.value}
                onClick={() => onSpeedChange(s.value)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                  speed === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

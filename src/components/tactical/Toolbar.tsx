import { DrawingTool } from './types';
import { Button } from '@/components/ui/button';
import {
  MousePointer2, ArrowRight, Spline, Minus, MoreHorizontal, Pencil, Eraser, Trash2,
  Maximize, Type, Circle, UserPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawColor: string;
  onDrawColorChange: (color: string) => void;
  onClearDrawings: () => void;
  onAddHomePlayer: () => void;
  onAddAwayPlayer: () => void;
  onFullscreen: () => void;
}

const TOOLS: { tool: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Seleccionar' },
  { tool: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Flecha' },
  { tool: 'curved-arrow', icon: <Spline className="h-4 w-4" />, label: 'Flecha curva' },
  { tool: 'line', icon: <Minus className="h-4 w-4" />, label: 'Línea' },
  { tool: 'dashed', icon: <MoreHorizontal className="h-4 w-4" />, label: 'Línea punteada' },
  { tool: 'free', icon: <Pencil className="h-4 w-4" />, label: 'Dibujo libre' },
  { tool: 'label', icon: <Type className="h-4 w-4" />, label: 'Etiqueta de texto' },
  { tool: 'ball', icon: <Circle className="h-4 w-4" />, label: 'Colocar balón' },
  { tool: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Borrador' },
];

const COLORS = ['#ffffff', '#ff4444', '#4488ff', '#ffcc00', '#00cc66', '#ff8800', '#cc44ff', '#000000'];

export default function Toolbar({
  tool, onToolChange, drawColor, onDrawColorChange,
  onClearDrawings, onAddHomePlayer, onAddAwayPlayer, onFullscreen,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg">
      {/* Drawing tools */}
      <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
        {TOOLS.map(t => (
          <Button
            key={t.tool}
            variant={tool === t.tool ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onToolChange(t.tool)}
            title={t.label}
          >
            {t.icon}
          </Button>
        ))}
      </div>

      {/* Color picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Color">
            <div className="w-4 h-4 rounded-full border-2 border-border" style={{ background: drawColor }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex flex-wrap gap-1 p-2 w-auto min-w-0">
          {COLORS.map(c => (
            <button
              key={c}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: drawColor === c ? '#fff' : 'rgba(0,0,0,0.15)' }}
              onClick={() => onDrawColorChange(c)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onClearDrawings} title="Borrar dibujos">
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Quick add players */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={onAddHomePlayer}
        title="Añadir jugador local"
      >
        <div className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} />
        <UserPlus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={onAddAwayPlayer}
        title="Añadir jugador rival"
      >
        <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
        <UserPlus className="h-3.5 w-3.5" />
      </Button>

      <div className="flex-1" />

      {/* Fullscreen */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFullscreen} title="Pantalla completa">
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}

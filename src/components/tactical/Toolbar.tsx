import { DrawingTool, FORMATIONS, SET_PIECE_TEMPLATES } from './types';
import { Button } from '@/components/ui/button';
import {
  MousePointer2, ArrowRight, Spline, Minus, MoreHorizontal, Pencil, Eraser, Trash2,
  Maximize, Type, Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawColor: string;
  onDrawColorChange: (color: string) => void;
  onClearDrawings: () => void;
  onFormationSelect: (formationKey: string) => void;
  onSetPieceSelect: (templateKey: string) => void;
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
  onClearDrawings, onFormationSelect, onSetPieceSelect, onFullscreen,
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

      {/* Formations */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Formación
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.keys(FORMATIONS).map(key => (
            <DropdownMenuItem key={key} onClick={() => onFormationSelect(key)}>
              {FORMATIONS[key].name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Set pieces */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Estrategia
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-[10px]">Jugadas a balón parado</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.keys(SET_PIECE_TEMPLATES).map(key => (
            <DropdownMenuItem key={key} onClick={() => onSetPieceSelect(key)}>
              {SET_PIECE_TEMPLATES[key].name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* Fullscreen */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFullscreen} title="Pantalla completa">
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}

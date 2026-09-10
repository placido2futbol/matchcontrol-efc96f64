import { DrawingTool } from './types';
import { Button } from '@/components/ui/button';
import {
  MousePointer2, ArrowRight, Spline, Minus, MoreHorizontal, Pencil, Eraser, Trash2,
  Maximize, Type, Circle, UserPlus, Shield, X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getFcfTeamsForClub } from '@/data/fcf-teams';
import { useClub } from '@/hooks/useClub';

interface ToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawColor: string;
  onDrawColorChange: (color: string) => void;
  onClearDrawings: () => void;
  onAddHomePlayer: () => void;
  onAddAwayPlayer: () => void;
  onFullscreen: () => void;
  showCrest?: boolean;
  crestUrl?: string;
  onSelectCrest?: (url: string | null) => void;
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
  showCrest, crestUrl, onSelectCrest,
}: ToolbarProps) {
  const { club } = useClub();
  const crestTeams = getFcfTeamsForClub(club?.name_key);
  return (
    <div className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-xl shadow-lg shrink-0">
      {/* Drawing tools */}
      <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
        {TOOLS.map(t => (
          <Button
            key={t.tool}
            variant={tool === t.tool ? 'default' : 'outline'}
            size="icon"
            className={`h-8 w-8 ${tool !== t.tool ? 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground border-border' : ''}`}
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
          <Button variant="outline" size="icon" className="h-8 w-8 bg-muted border-border" title="Color">
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
      <Button variant="outline" size="icon" className="h-8 w-8 bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20" onClick={onClearDrawings} title="Borrar dibujos">
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Quick add players */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1 bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
        onClick={onAddHomePlayer}
        title="Añadir jugador local"
      >
        <div className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }} />
        <UserPlus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1 bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/20"
        onClick={onAddAwayPlayer}
        title="Añadir jugador rival"
      >
        <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
        <UserPlus className="h-3.5 w-3.5" />
      </Button>

      {/* Crest dropdown */}
      {onSelectCrest && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 ${showCrest ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted text-foreground border-border hover:bg-accent'}`}
              title="Escudo en campo"
            >
              {showCrest && crestUrl ? (
                <img src={crestUrl} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-64">
            {showCrest && (
              <>
                <DropdownMenuItem onClick={() => onSelectCrest(null)} className="text-destructive gap-2 text-xs">
                  <X className="h-3.5 w-3.5" />
                  Quitar escudo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {crestTeams.map(team => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => onSelectCrest(team.crest)}
                className={`gap-2 text-xs ${crestUrl === team.crest ? 'bg-primary/10' : ''}`}
              >
                <img
                  src={team.crest}
                  alt={team.name}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="truncate">{team.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex-1" />

      {/* Fullscreen */}
      <Button variant="outline" size="icon" className="h-8 w-8 bg-muted text-foreground border-border hover:bg-accent" onClick={onFullscreen} title="Pantalla completa">
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}

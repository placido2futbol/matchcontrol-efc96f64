import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

interface PlayerWithIdx {
  player_name: string;
  dorsal: string;
  photo_url: string;
  status: string;
  _idx: number;
}

interface Props {
  substitutePlayers: PlayerWithIdx[];
  desconvocados: PlayerWithIdx[];
  selectedSlot: number | null;
  onAssignToSlot: (playerIdx: number) => void;
  onToggleSubstitute: (playerIdx: number) => void;
  onRemoveFromList: (playerIdx: number) => void;
  onPanelDragStart: (e: React.PointerEvent, playerIdx: number) => void;
  onPanelDragMove: (e: React.PointerEvent) => void;
  onPanelDragEnd: (e: React.PointerEvent) => void;
  panelDragStarted: React.MutableRefObject<boolean>;
  onResetPanelDrag: () => void;
  onImportExcel: (file: File) => void;
}

export default function CallupPlayerPanel({
  substitutePlayers, desconvocados, selectedSlot,
  onAssignToSlot, onToggleSubstitute, onRemoveFromList,
  onPanelDragStart, onPanelDragMove, onPanelDragEnd,
  panelDragStarted, onResetPanelDrag, onImportExcel,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportExcel(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3" /> Importar Excel
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
          SUPLENTES ({substitutePlayers.length})
        </h3>
        <div className="space-y-1.5">
          {substitutePlayers.map(p => (
            <div key={p._idx}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-primary-foreground cursor-grab active:cursor-grabbing transition-all hover:brightness-110 touch-none select-none bg-primary"
              onPointerDown={(e) => onPanelDragStart(e, p._idx)}
              onPointerMove={onPanelDragMove}
              onPointerUp={(e) => {
                if (!panelDragStarted.current) {
                  onResetPanelDrag();
                  onToggleSubstitute(p._idx);
                } else {
                  onPanelDragEnd(e);
                }
              }}>
              <span className="text-sm font-black w-7">{p.dorsal}</span>
              <span className="text-xs font-bold uppercase flex-1 truncate">{p.player_name}</span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemoveFromList(p._idx); }} className="text-primary-foreground/60 hover:text-primary-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {substitutePlayers.length === 0 && (
            <p className="text-[10px] text-muted-foreground/50 text-center py-2">Haz clic en un desconvocado para marcarlo como suplente</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          DESCONVOCADOS ({desconvocados.length})
        </h3>
        <div className="space-y-1.5">
          {desconvocados.map(p => (
            <div key={p._idx}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-grab active:cursor-grabbing touch-none select-none ${
                selectedSlot !== null
                  ? 'bg-accent/20 hover:bg-accent/40 border border-accent/40 shadow-sm shadow-accent/10'
                  : 'bg-muted/50 hover:bg-muted/80'
              }`}
              onPointerDown={(e) => onPanelDragStart(e, p._idx)}
              onPointerMove={onPanelDragMove}
              onPointerUp={(e) => {
                if (!panelDragStarted.current) {
                  onResetPanelDrag();
                  if (selectedSlot !== null) {
                    onAssignToSlot(p._idx);
                  } else {
                    onToggleSubstitute(p._idx);
                  }
                } else {
                  onPanelDragEnd(e);
                }
              }}>
              <span className="text-sm font-black w-7 text-muted-foreground">{p.dorsal}</span>
              <span className="text-xs font-bold uppercase flex-1 truncate text-muted-foreground">{p.player_name}</span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemoveFromList(p._idx); }} className="text-muted-foreground/30 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { TacticalScene } from './types';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface SceneManagerProps {
  scenes: TacticalScene[];
  activeSceneId: string;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onDuplicateScene: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onRenameScene: (id: string, name: string) => void;
}

export default function SceneManager({
  scenes, activeSceneId, onSelectScene, onAddScene, onDuplicateScene, onDeleteScene, onRenameScene,
}: SceneManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Escenas</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddScene}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1">
        {scenes.map(s => (
          <div
            key={s.id}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-colors cursor-pointer group ${
              s.id === activeSceneId ? 'bg-primary/15 text-primary' : 'hover:bg-muted'
            }`}
            onClick={() => onSelectScene(s.id)}
          >
            {editingId === s.id ? (
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => { onRenameScene(s.id, editName); setEditingId(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { onRenameScene(s.id, editName); setEditingId(null); } }}
                className="h-6 text-xs flex-1"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs font-medium flex-1 truncate">{s.name}</span>
            )}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); setEditName(s.name); setEditingId(s.id); }}>
                <Pencil className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); onDuplicateScene(s.id); }}>
                <Copy className="h-2.5 w-2.5" />
              </Button>
              {scenes.length > 1 && (
                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={e => { e.stopPropagation(); onDeleteScene(s.id); }}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

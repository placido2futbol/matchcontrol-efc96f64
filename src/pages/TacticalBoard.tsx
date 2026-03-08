import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import PitchSVG from '@/components/tactical/PitchSVG';
import PlayerToken from '@/components/tactical/PlayerToken';
import DrawingLayer from '@/components/tactical/DrawingLayer';
import Toolbar from '@/components/tactical/Toolbar';
import BenchPanel from '@/components/tactical/BenchPanel';
import PlayerEditor from '@/components/tactical/PlayerEditor';
import SceneManager from '@/components/tactical/SceneManager';
import {
  TacticalPlayer, TacticalScene, DrawingTool, DrawingPath, TextLabel, BallPosition,
  FORMATIONS, SET_PIECE_TEMPLATES, createDefaultPlayers, generateId,
} from '@/components/tactical/types';

function createDefaultScene(): TacticalScene {
  return {
    id: generateId(),
    name: 'Ataque',
    players: createDefaultPlayers(),
    drawings: [],
    labels: [],
    ball: { x: 50, y: 50, visible: false },
  };
}

export default function TacticalBoard() {
  const navigate = useNavigate();
  const pitchRef = useRef<HTMLDivElement>(null);

  const [scenes, setScenes] = useState<TacticalScene[]>([createDefaultScene()]);
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id);
  const [tool, setTool] = useState<DrawingTool>('select');
  const [drawColor, setDrawColor] = useState('#ff4444');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [labelInput, setLabelInput] = useState<{ x: number; y: number } | null>(null);
  const [labelText, setLabelText] = useState('');

  const activeScene = scenes.find(s => s.id === activeSceneId)!;
  const fieldPlayers = activeScene.players.filter(p => p.onField);
  const selectedPlayer = activeScene.players.find(p => p.id === selectedPlayerId) || null;

  const updateScene = useCallback((updater: (scene: TacticalScene) => TacticalScene) => {
    setScenes(prev => prev.map(s => s.id === activeSceneId ? updater(s) : s));
  }, [activeSceneId]);

  // Player handlers
  const handlePlayerDragEnd = useCallback((id: string, x: number, y: number) => {
    updateScene(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, x, y } : p) }));
  }, [updateScene]);

  const handlePlayerClick = useCallback((player: TacticalPlayer) => {
    if (tool !== 'select') return;
    setSelectedPlayerId(prev => prev === player.id ? null : player.id);
  }, [tool]);

  const handleUpdatePlayer = useCallback((updated: TacticalPlayer) => {
    updateScene(s => ({ ...s, players: s.players.map(p => p.id === updated.id ? updated : p) }));
  }, [updateScene]);

  const handleDuplicatePlayer = useCallback((player: TacticalPlayer) => {
    const dup: TacticalPlayer = { ...player, id: generateId(), x: player.x + 3, y: player.y + 3, name: player.name + ' (2)' };
    updateScene(s => ({ ...s, players: [...s.players, dup] }));
    setSelectedPlayerId(null);
  }, [updateScene]);

  const handleRemovePlayer = useCallback((id: string) => {
    updateScene(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
    setSelectedPlayerId(null);
  }, [updateScene]);

  const handleMoveToBench = useCallback((id: string) => {
    updateScene(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, onField: false } : p) }));
    setSelectedPlayerId(null);
  }, [updateScene]);

  const handleMoveToField = useCallback((id: string) => {
    updateScene(s => ({ ...s, players: s.players.map(p => p.id === id ? { ...p, onField: true, x: 50, y: 50 } : p) }));
  }, [updateScene]);

  const handleAddPlayer = useCallback(() => {
    const maxNum = Math.max(0, ...activeScene.players.map(p => p.number));
    const newPlayer: TacticalPlayer = {
      id: generateId(), name: `Jugador ${maxNum + 1}`, number: maxNum + 1,
      position: 'SUB', team: 'home', color: '#3B82F6', x: 0, y: 0, onField: false,
    };
    updateScene(s => ({ ...s, players: [...s.players, newPlayer] }));
  }, [activeScene.players, updateScene]);

  // Formation
  const handleFormationSelect = useCallback((key: string) => {
    const formation = FORMATIONS[key];
    updateScene(s => {
      const onField = s.players.filter(p => p.onField);
      const updated = s.players.map(p => {
        if (!p.onField) return p;
        const idx = onField.indexOf(p);
        if (idx < formation.positions.length) {
          return { ...p, x: formation.positions[idx].x, y: formation.positions[idx].y };
        }
        return { ...p, onField: false };
      });
      return { ...s, players: updated };
    });
  }, [updateScene]);

  // Set piece templates
  const handleSetPieceSelect = useCallback((key: string) => {
    const template = SET_PIECE_TEMPLATES[key];
    const players: TacticalPlayer[] = template.players.map((tp, i) => ({
      id: generateId(),
      name: tp.name || `Player ${i + 1}`,
      number: tp.number || i + 1,
      position: tp.position || 'FLD',
      team: 'home' as const,
      color: tp.color || '#3B82F6',
      x: tp.x || 50,
      y: tp.y || 50,
      onField: tp.onField !== false,
    }));
    // Add bench slots
    for (let i = players.length + 1; i <= 20; i++) {
      players.push({
        id: generateId(), name: `Jugador ${i}`, number: i,
        position: 'SUB', team: 'home', color: '#3B82F6', x: 0, y: 0, onField: false,
      });
    }
    const labels: TextLabel[] = template.labels.map(l => ({ ...l, id: generateId() }));
    updateScene(s => ({ ...s, players, labels, ball: template.ball, drawings: [] }));
  }, [updateScene]);

  // Drawings
  const handleDrawingsChange = useCallback((drawings: DrawingPath[]) => {
    updateScene(s => ({ ...s, drawings }));
  }, [updateScene]);

  const handleClearDrawings = useCallback(() => {
    updateScene(s => ({ ...s, drawings: [] }));
  }, [updateScene]);

  // Ball & Label placement via pitch click
  const handlePitchClick = useCallback((e: React.MouseEvent) => {
    if (tool === 'select') {
      setSelectedPlayerId(null);
      return;
    }
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (tool === 'ball') {
      updateScene(s => ({ ...s, ball: { x, y, visible: true } }));
      setTool('select');
    } else if (tool === 'label') {
      setLabelInput({ x, y });
    }
  }, [tool, updateScene]);

  const handleAddLabel = useCallback(() => {
    if (!labelInput || !labelText.trim()) { setLabelInput(null); setLabelText(''); return; }
    const label: TextLabel = {
      id: generateId(), text: labelText.trim(),
      x: labelInput.x, y: labelInput.y,
      color: '#000000', bgColor: '#ffff00', fontSize: 'md',
    };
    updateScene(s => ({ ...s, labels: [...s.labels, label] }));
    setLabelInput(null);
    setLabelText('');
    setTool('select');
  }, [labelInput, labelText, updateScene]);

  // Scenes
  const handleAddScene = useCallback(() => {
    const newScene: TacticalScene = {
      id: generateId(), name: `Escena ${scenes.length + 1}`,
      players: createDefaultPlayers(), drawings: [], labels: [],
      ball: { x: 50, y: 50, visible: false },
    };
    setScenes(prev => [...prev, newScene]);
    setActiveSceneId(newScene.id);
  }, [scenes.length]);

  const handleDuplicateScene = useCallback((id: string) => {
    const src = scenes.find(s => s.id === id);
    if (!src) return;
    const dup: TacticalScene = { ...JSON.parse(JSON.stringify(src)), id: generateId(), name: src.name + ' (copia)' };
    setScenes(prev => [...prev, dup]);
    setActiveSceneId(dup.id);
  }, [scenes]);

  const handleDeleteScene = useCallback((id: string) => {
    if (scenes.length <= 1) return;
    const remaining = scenes.filter(s => s.id !== id);
    setScenes(remaining);
    if (activeSceneId === id) setActiveSceneId(remaining[0].id);
  }, [scenes, activeSceneId]);

  const handleRenameScene = useCallback((id: string, name: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, name: name || s.name } : s));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-base sm:text-lg text-foreground">⚽ Pizarra Táctica</h1>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-1.5 shrink-0">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          onClearDrawings={handleClearDrawings}
          onFormationSelect={handleFormationSelect}
          onSetPieceSelect={handleSetPieceSelect}
          onFullscreen={toggleFullscreen}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        {/* Left sidebar */}
        <div className="w-40 shrink-0 bg-card/50 border border-border rounded-xl p-2 overflow-y-auto hidden md:block">
          <SceneManager
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={setActiveSceneId}
            onAddScene={handleAddScene}
            onDuplicateScene={handleDuplicateScene}
            onDeleteScene={handleDeleteScene}
            onRenameScene={handleRenameScene}
          />
        </div>

        {/* Pitch */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div
            ref={pitchRef}
            className="relative w-full rounded-xl overflow-hidden shadow-2xl"
            style={{ aspectRatio: '1050/680', maxHeight: 'calc(100vh - 140px)' }}
            onClick={handlePitchClick}
          >
            <PitchSVG />

            <DrawingLayer
              drawings={activeScene.drawings}
              onDrawingsChange={handleDrawingsChange}
              tool={tool}
              drawColor={drawColor}
              containerRef={pitchRef as React.RefObject<HTMLDivElement>}
            />

            {/* Ball */}
            {activeScene.ball.visible && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${activeScene.ball.x}%`,
                  top: `${activeScene.ball.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15,
                }}
              >
                <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-800 shadow-lg flex items-center justify-center">
                  <span className="text-[8px]">⚽</span>
                </div>
              </div>
            )}

            {/* Text labels */}
            {activeScene.labels.map(label => (
              <div
                key={label.id}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 12,
                }}
              >
                <span
                  className="font-extrabold whitespace-nowrap px-2 py-0.5"
                  style={{
                    color: label.color,
                    background: label.bgColor,
                    fontSize: label.fontSize === 'lg' ? 14 : label.fontSize === 'md' ? 11 : 9,
                    border: label.bgColor !== 'transparent' ? '2px solid rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {label.text}
                </span>
              </div>
            ))}

            {/* Label input popup */}
            {labelInput && (
              <div
                className="absolute z-50 bg-card border border-border rounded-lg shadow-xl p-2 flex gap-1"
                style={{
                  left: `${Math.min(labelInput.x, 75)}%`,
                  top: `${Math.min(labelInput.y, 85)}%`,
                }}
              >
                <Input
                  value={labelText}
                  onChange={e => setLabelText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddLabel(); if (e.key === 'Escape') { setLabelInput(null); setLabelText(''); } }}
                  placeholder="Texto..."
                  className="h-7 text-xs w-32"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleAddLabel}>OK</Button>
              </div>
            )}

            {/* Players */}
            {fieldPlayers.map(p => (
              <PlayerToken
                key={p.id}
                player={p}
                containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                onDragEnd={handlePlayerDragEnd}
                onClick={handlePlayerClick}
                isSelected={selectedPlayerId === p.id}
              />
            ))}

            {/* Player editor */}
            {selectedPlayer && selectedPlayer.onField && (
              <PlayerEditor
                player={selectedPlayer}
                onUpdate={handleUpdatePlayer}
                onDuplicate={handleDuplicatePlayer}
                onRemove={handleRemovePlayer}
                onMoveToBench={handleMoveToBench}
                onClose={() => setSelectedPlayerId(null)}
              />
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-44 shrink-0 bg-card/50 border border-border rounded-xl p-2 overflow-y-auto hidden md:block">
          <BenchPanel
            players={activeScene.players}
            onAddPlayer={handleAddPlayer}
            onMoveToField={handleMoveToField}
            onRemovePlayer={handleRemovePlayer}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import PitchSVG from '@/components/tactical/PitchSVG';
import HalfPitchSVG from '@/components/tactical/HalfPitchSVG';
import PlayerToken from '@/components/tactical/PlayerToken';
import DrawingLayer from '@/components/tactical/DrawingLayer';
import Toolbar from '@/components/tactical/Toolbar';
import PlayerEditor from '@/components/tactical/PlayerEditor';
import RosterPanel from '@/components/tactical/RosterPanel';
import SceneManager from '@/components/tactical/SceneManager';
import { createPPTScenes } from '@/components/tactical/pptScenes';
import {
  TacticalPlayer, TacticalScene, DrawingTool, DrawingPath, TextLabel, BallPosition, SceneLegend,
  generateId,
} from '@/components/tactical/types';

function createEmptyScene(name: string = 'Nueva escena'): TacticalScene {
  return {
    id: generateId(),
    name,
    players: [],
    drawings: [],
    labels: [],
    ball: { x: 50, y: 50, visible: false },
  };
}

const initialScenes = createPPTScenes();

export default function TacticalBoard() {
  const navigate = useNavigate();
  const pitchRef = useRef<HTMLDivElement>(null);

  const [scenes, setScenes] = useState<TacticalScene[]>(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState(initialScenes[0].id);
  const [tool, setTool] = useState<DrawingTool>('select');
  const [drawColor, setDrawColor] = useState('#ff4444');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState<{ x: number; y: number } | null>(null);
  const [labelText, setLabelText] = useState('');
  const [pendingRoster, setPendingRoster] = useState<Partial<TacticalPlayer> | null>(null);

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

  // Quick add players directly to the field center
  const addPlayerToField = useCallback((team: 'home' | 'away') => {
    const existing = activeScene.players;
    const teamPlayers = existing.filter(p => p.team === team);
    const num = teamPlayers.length + 1;
    const color = team === 'home' ? '#3B82F6' : '#EF4444';
    const newPlayer: TacticalPlayer = {
      id: generateId(),
      name: `${num}`,
      number: num,
      position: '',
      team,
      color,
      x: 50,
      y: 50,
      onField: true,
    };
    updateScene(s => ({ ...s, players: [...s.players, newPlayer] }));
  }, [activeScene.players, updateScene]);

  // Add from roster - set pending, user clicks field to place
  const handleSelectFromRoster = useCallback((partial: Partial<TacticalPlayer>) => {
    setPendingRoster(partial);
    setTool('select');
    setSelectedPlayerId(null);
  }, []);

  // Drawings
  const handleDrawingsChange = useCallback((drawings: DrawingPath[]) => {
    updateScene(s => ({ ...s, drawings }));
  }, [updateScene]);

  const handleClearDrawings = useCallback(() => {
    updateScene(s => ({ ...s, drawings: [] }));
  }, [updateScene]);

  // Ball, Label & Roster placement
  const handlePitchClick = useCallback((e: React.MouseEvent) => {
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Place pending roster player
    if (pendingRoster) {
      const newPlayer: TacticalPlayer = {
        id: generateId(),
        name: pendingRoster.name || 'Player',
        number: pendingRoster.number || 1,
        position: pendingRoster.position || '',
        team: pendingRoster.team || 'home',
        color: pendingRoster.color || '#3B82F6',
        x: Math.round(x / 2) * 2,
        y: Math.round(y / 2) * 2,
        onField: true,
      };
      updateScene(s => ({ ...s, players: [...s.players, newPlayer] }));
      setPendingRoster(null);
      return;
    }

    if (tool === 'select') {
      setSelectedPlayerId(null);
      return;
    }

    if (tool === 'ball') {
      updateScene(s => ({ ...s, ball: { x, y, visible: true } }));
      setTool('select');
    } else if (tool === 'label') {
      setLabelInput({ x, y });
    }
  }, [tool, updateScene, pendingRoster]);

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

  const handleRemoveLabel = useCallback((id: string) => {
    updateScene(s => ({ ...s, labels: s.labels.filter(l => l.id !== id) }));
  }, [updateScene]);

  const handleLabelDragEnd = useCallback((id: string, x: number, y: number) => {
    updateScene(s => ({ ...s, labels: s.labels.map(l => l.id === id ? { ...l, x, y } : l) }));
  }, [updateScene]);

  // Scenes
  const handleAddScene = useCallback(() => {
    const newScene = createEmptyScene(`Escena ${scenes.length + 1}`);
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
    } else {
      document.exitFullscreen?.();
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
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-2">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          onClearDrawings={handleClearDrawings}
          onAddHomePlayer={() => addPlayerToField('home')}
          onAddAwayPlayer={() => addPlayerToField('away')}
          onFullscreen={toggleFullscreen}
        />
        {activeScene.name !== '11 Inicial' && activeScene.titlePos?.x === -100 && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-7"
            onClick={() => updateScene(s => ({ ...s, titlePos: { x: 88, y: 6 } }))}
          >
            Mostrar título
          </Button>
        )}
      </div>

      {/* Roster panel */}
      <div className="px-3 py-1 shrink-0 border-b border-border bg-card/40">
        <RosterPanel onAddPlayer={handleSelectFromRoster} />
        {pendingRoster && (
          <div className="flex items-center gap-2 py-1 px-2 mt-1 rounded-lg bg-primary/10 border border-primary/30 animate-fade-in">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: pendingRoster.color || '#3B82F6' }}>
              {pendingRoster.number}
            </div>
            <span className="text-xs font-semibold text-primary">{pendingRoster.name}</span>
            <span className="text-[10px] text-muted-foreground">← Haz clic en el campo para colocarlo</span>
            <button onClick={() => setPendingRoster(null)} className="ml-auto text-[10px] text-muted-foreground hover:text-destructive">✕</button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-2 p-2 min-h-0">
        {/* Left sidebar - Scenes */}
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
            className={`relative w-full rounded-xl overflow-hidden shadow-2xl ${pendingRoster ? 'ring-2 ring-primary/50' : ''}`}
            style={{
              aspectRatio: activeScene.halfPitch ? '1050/750' : '1050/680',
              maxHeight: 'calc(100vh - 140px)',
              cursor: pendingRoster ? 'crosshair' : undefined,
            }}
            onClick={handlePitchClick}
          >
            {activeScene.halfPitch ? <HalfPitchSVG /> : <PitchSVG />}

            <DrawingLayer
              drawings={activeScene.drawings}
              onDrawingsChange={handleDrawingsChange}
              tool={tool}
              drawColor={drawColor}
              containerRef={pitchRef as React.RefObject<HTMLDivElement>}
              halfPitch={activeScene.halfPitch}
            />

            {/* Ball (draggable) */}
            {activeScene.ball.visible && (
              <DraggableElement
                x={activeScene.ball.x}
                y={activeScene.ball.y}
                containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                onDragEnd={(x, y) => updateScene(s => ({ ...s, ball: { x, y, visible: true } }))}
                zIndex={15}
              >
                <svg width="28" height="28" viewBox="0 0 100 100" className="drop-shadow-lg pointer-events-none">
                  <circle cx="50" cy="50" r="48" fill="white" stroke="#222" strokeWidth="3"/>
                  <path d="M50 2 L62 22 L88 22 L68 38 L76 62 L50 48 L24 62 L32 38 L12 22 L38 22 Z" fill="#222" opacity="0.85"/>
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#444" strokeWidth="1.5"/>
                </svg>
              </DraggableElement>
            )}

            {/* Scene title overlay with crest (draggable, hideable) */}
            {activeScene.name !== '11 Inicial' && activeScene.titlePos?.x !== -100 && (
              <DraggableElement
                x={activeScene.titlePos?.x ?? 88}
                y={activeScene.titlePos?.y ?? 6}
                containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                onDragEnd={(x, y) => updateScene(s => ({ ...s, titlePos: { x, y } }))}
                zIndex={35}
              >
                <div className="flex items-center gap-1 relative group">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Escudo_UE_Sant_Pau.png/200px-Escudo_UE_Sant_Pau.png"
                    alt="Escudo Sant Pau"
                    className="w-10 h-10 object-contain drop-shadow-lg pointer-events-none"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div
                    className="pointer-events-none"
                    style={{
                      background: '#ffff00',
                      padding: '5px 12px',
                      fontFamily: "'Russo One', 'Arial Black', sans-serif",
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#000',
                      lineHeight: 1.2,
                      textAlign: 'center',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
                      border: '2px solid rgba(0,0,0,0.2)',
                      maxWidth: 160,
                    }}
                  >
                    {activeScene.name}
                  </div>
                  <button
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); updateScene(s => ({ ...s, titlePos: { x: -100, y: -100 } })); }}
                    title="Ocultar título"
                  >
                    ×
                  </button>
                </div>
              </DraggableElement>
            )}


            {/* Text labels (draggable) */}
            {activeScene.labels.map(label => (
              <DraggableElement
                key={label.id}
                x={label.x}
                y={label.y}
                containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                onDragEnd={(x, y) => handleLabelDragEnd(label.id, x, y)}
                zIndex={12}
              >
                <span
                  className="whitespace-nowrap cursor-grab active:cursor-grabbing group relative"
                  style={{
                    color: label.color,
                    fontSize: label.fontSize === 'lg' ? 24 : label.fontSize === 'md' ? 18 : 14,
                    fontWeight: 900,
                    fontFamily: "'Russo One', 'Arial Black', sans-serif",
                    textShadow: '2px 2px 6px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.4)',
                    padding: label.bgColor !== 'transparent' ? '4px 14px' : '2px 6px',
                    background: label.bgColor !== 'transparent' ? label.bgColor : 'transparent',
                    border: label.bgColor !== 'transparent' ? '2px solid rgba(0,0,0,0.25)' : 'none',
                    letterSpacing: '0.5px',
                  }}
                >
                  {label.text}
                  {tool === 'eraser' && (
                    <button
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleRemoveLabel(label.id); }}
                    >
                      ×
                    </button>
                  )}
                </span>
              </DraggableElement>
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
                onMoveToBench={() => handleRemovePlayer(selectedPlayer.id)}
                onClose={() => setSelectedPlayerId(null)}
              />
            )}

            {/* Empty state hint */}
            {fieldPlayers.length === 0 && !labelInput && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-black/50 text-white rounded-xl px-6 py-4 text-center">
                  <p className="text-sm font-bold">Campo vacío</p>
                  <p className="text-xs mt-1 opacity-80">
                    Usa los botones <span className="inline-block w-3 h-3 rounded-full bg-blue-500 align-middle mx-0.5" />+ y <span className="inline-block w-3 h-3 rounded-full bg-red-500 align-middle mx-0.5" />+ de la barra para añadir jugadores
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Legend (like PPT) */}
        <div className="w-48 shrink-0 bg-card/50 border border-border rounded-xl p-2 overflow-y-auto hidden md:block">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Jugadores ({fieldPlayers.length})
          </h3>
          <div className="space-y-1">
            {fieldPlayers.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedPlayerId === p.id ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedPlayerId(selectedPlayerId === p.id ? null : p.id)}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-sm"
                  style={{
                    background: p.color,
                    color: isLight(p.color) ? '#1a1a2e' : '#fff',
                    border: '2px solid rgba(0,0,0,0.2)',
                  }}
                >
                  {p.number}
                </div>
                <span
                  className="text-xs font-bold truncate px-1.5 py-0.5"
                  style={{
                    background: p.team === 'away' ? 'transparent' : '#ffff00',
                    color: '#cc0000',
                    border: p.team === 'away' ? 'none' : '1px solid #cc0000',
                  }}
                >
                  {p.name.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          {fieldPlayers.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-8">
              Añade jugadores con los botones de la barra superior
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// Generic draggable element using pointer events (works reliably for ball, labels, etc.)
function DraggableElement({ x, y, containerRef, onDragEnd, zIndex, children }: {
  x: number;
  y: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (x: number, y: number) => void;
  zIndex: number;
  children: React.ReactNode;
}) {
  const startPos = useRef({ x: 0, y: 0 });
  const startElPos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    startElPos.current = { x, y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 2 || dy > 2) dragging.current = true;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newX = Math.max(1, Math.min(99, startElPos.current.x + (dx / rect.width) * 100));
    const newY = Math.max(1, Math.min(99, startElPos.current.y + (dy / rect.height) * 100));
    onDragEnd(Math.round(newX), Math.round(newY));
    dragging.current = false;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute select-none cursor-grab active:cursor-grabbing touch-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex,
      }}
    >
      {children}
    </div>
  );
}

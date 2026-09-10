import { useState, useRef, useCallback, useEffect } from 'react';
import soccerBallImg from '@/assets/soccer-ball.png';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Share2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
const SANT_PAU_CREST = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Escudo_UE_Sant_Pau.png/200px-Escudo_UE_Sant_Pau.png";
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import PitchSVG from '@/components/tactical/PitchSVG';
import HalfPitchSVG from '@/components/tactical/HalfPitchSVG';
import PlayerToken from '@/components/tactical/PlayerToken';
import DrawingLayer from '@/components/tactical/DrawingLayer';
import Toolbar from '@/components/tactical/Toolbar';
import PlayerEditor from '@/components/tactical/PlayerEditor';
import RosterPanel from '@/components/tactical/RosterPanel';
import SceneManager from '@/components/tactical/SceneManager';
import FrameTimeline from '@/components/tactical/FrameTimeline';
import { createPPTScenes } from '@/components/tactical/pptScenes';
import {
  TacticalPlayer, TacticalScene, DrawingTool, DrawingPath, TextLabel, BallPosition, SceneLegend,
  AnimationFrame, generateId,
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
  const { user } = useAuth();
  const pitchRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [scenes, setScenes] = useState<TacticalScene[]>(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState(initialScenes[0].id);
  const [tool, setTool] = useState<DrawingTool>('select');
  const [drawColor, setDrawColor] = useState('#ff4444');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState<{ x: number; y: number } | null>(null);
  const [labelText, setLabelText] = useState('');
  const [pendingRoster, setPendingRoster] = useState<Partial<TacticalPlayer> | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [boardCrest, setBoardCrest] = useState<string | null>(null);
  const [playingFrames, setPlayingFrames] = useState(false);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [frameSpeed, setFrameSpeed] = useState(1500);
  const [loadedFromDb, setLoadedFromDb] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved board from DB on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('tactical_boards')
        .select('id, scenes')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (data && data.scenes) {
        const loaded = data.scenes as unknown as TacticalScene[];
        if (loaded.length > 0) {
          setScenes(loaded);
          setActiveSceneId(loaded[0].id);
          setShareId(data.id);
          setLoadedFromDb(true);
        }
      }
    })();
  }, [user]);

  // Auto-save to DB with debounce (2s after last change)
  useEffect(() => {
    if (!user || !loadedFromDb && !shareId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const scenesWithCrest = scenes.map(s => ({
        ...s,
        showCrest: !!boardCrest,
        crestUrl: boardCrest || undefined,
      }));
      try {
        if (shareId) {
          await supabase.from('tactical_boards').update({
            scenes: scenesWithCrest as any,
            updated_at: new Date().toISOString(),
          }).eq('id', shareId);
        } else {
          const { data } = await supabase.from('tactical_boards').insert({
            user_id: user.id,
            name: 'Pizarra Táctica',
            scenes: scenesWithCrest as any,
          }).select('id').single();
          if (data) setShareId(data.id);
        }
      } catch {}
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [scenes, user, shareId, boardCrest]);

  const handleShare = useCallback(async () => {
    if (!user) {
      toast({ title: 'Inicia sesión para compartir', variant: 'destructive' });
      return;
    }
    setSharing(true);
    // Inject board-level crest into all scenes for sharing
    const scenesWithCrest = scenes.map(s => ({
      ...s,
      showCrest: !!boardCrest,
      crestUrl: boardCrest || undefined,
    }));
    try {
      if (shareId) {
        await supabase.from('tactical_boards').update({
          scenes: scenesWithCrest as any,
          updated_at: new Date().toISOString(),
        }).eq('id', shareId);
      } else {
        const { data, error } = await supabase.from('tactical_boards').insert({
          user_id: user.id,
          name: 'Pizarra Táctica',
          scenes: scenesWithCrest as any,
        }).select('id').single();
        if (error) throw error;
        setShareId(data.id);
      }
      const url = `${window.location.origin}/tactical/view/${shareId || ''}`;
      // We need the ID from the insert, let's handle this properly
      if (!shareId) {
        const { data } = await supabase.from('tactical_boards')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (data) {
          setShareId(data.id);
          const shareUrl = `${window.location.origin}/tactical/view/${data.id}`;
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: '¡Enlace copiado!', description: 'Comparte este enlace para que puedan ver la pizarra.' });
        }
      } else {
        const shareUrl = `${window.location.origin}/tactical/view/${shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: '¡Enlace actualizado y copiado!' });
      }
    } catch (err) {
      toast({ title: 'Error al compartir', variant: 'destructive' });
    }
    setSharing(false);
  }, [user, scenes, shareId]);

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

  // Frame recording handlers
  const handleCaptureFrame = useCallback(() => {
    const frame: AnimationFrame = {
      id: generateId(),
      players: activeScene.players.filter(p => p.onField).map(p => ({ id: p.id, x: p.x, y: p.y })),
      ball: { ...activeScene.ball },
      drawings: JSON.parse(JSON.stringify(activeScene.drawings)),
    };
    updateScene(s => ({ ...s, frames: [...(s.frames || []), frame] }));
    setActiveFrameIndex((activeScene.frames?.length || 0));
    toast({ title: `Frame ${(activeScene.frames?.length || 0) + 1} capturado` });
  }, [activeScene, updateScene]);

  const handleDeleteFrame = useCallback((index: number) => {
    updateScene(s => {
      const frames = [...(s.frames || [])];
      frames.splice(index, 1);
      return { ...s, frames };
    });
    setActiveFrameIndex(null);
  }, [updateScene]);

  // Overlay positions for animation (doesn't modify scene data)
  const [animOverlay, setAnimOverlay] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [animBall, setAnimBall] = useState<BallPosition | null>(null);

  const handleSelectFrame = useCallback((index: number) => {
    const frames = activeScene.frames;
    if (!frames || !frames[index]) return;
    setActiveFrameIndex(index);
  }, [activeScene.frames]);

  const applyFrameOverlay = useCallback((frame: AnimationFrame) => {
    const overlay: Record<string, { x: number; y: number }> = {};
    frame.players.forEach(fp => { overlay[fp.id] = { x: fp.x, y: fp.y }; });
    setAnimOverlay(overlay);
    setAnimBall(frame.ball);
  }, []);

  const handlePlayFrames = useCallback(() => {
    const frames = activeScene.frames;
    if (!frames || frames.length < 2) return;
    setPlayingFrames(true);
    setActiveFrameIndex(0);
    applyFrameOverlay(frames[0]);
    let idx = 0;
    playTimerRef.current = setInterval(() => {
      idx = (idx + 1) % frames.length;
      setActiveFrameIndex(idx);
      applyFrameOverlay(frames[idx]);
    }, frameSpeed);
  }, [activeScene.frames, applyFrameOverlay, frameSpeed]);

  const handleStopFrames = useCallback(() => {
    setPlayingFrames(false);
    setAnimOverlay(null);
    setAnimBall(null);
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount or scene change
  useEffect(() => {
    handleStopFrames();
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [activeSceneId]);

  const ADMIN_EMAILS = ['pinilla.22@gmail.com', 'placido.futbol2@gmail.com'];
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-bold">Acceso restringido</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-base sm:text-lg text-foreground flex-1">⚽ Pizarra Táctica</h1>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleShare} disabled={sharing}>
          <Share2 className="h-3.5 w-3.5" />
          {sharing ? 'Compartiendo...' : shareId ? 'Actualizar enlace' : 'Compartir'}
        </Button>
      </div>

      {/* Toolbar + Frames */}
      <div className="px-2 py-1 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          onClearDrawings={handleClearDrawings}
          onAddHomePlayer={() => addPlayerToField('home')}
          onAddAwayPlayer={() => addPlayerToField('away')}
          onFullscreen={toggleFullscreen}
          showCrest={!!boardCrest}
          crestUrl={boardCrest || undefined}
          onSelectCrest={(url) => setBoardCrest(url)}
        />
        <FrameTimeline
          frames={activeScene.frames || []}
          onCaptureFrame={handleCaptureFrame}
          onDeleteFrame={handleDeleteFrame}
          onPreview={handlePlayFrames}
          onStop={handleStopFrames}
          isPlaying={playingFrames}
          activeFrameIndex={activeFrameIndex}
          onSelectFrame={handleSelectFrame}
          speed={frameSpeed}
          onSpeedChange={(s) => { setFrameSpeed(s); if (playingFrames) { handleStopFrames(); } }}
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

      <div className="px-2 py-1 shrink-0 border-b border-border bg-card/40 overflow-x-auto">
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
      <div className="flex-1 flex gap-1 p-1 min-h-0 overflow-hidden">
        {/* Left sidebar - Scenes (hidden on mobile) */}
        {!isMobile && (
          <div className="w-52 shrink-0 bg-card/50 border border-border rounded-xl p-2 overflow-y-auto hidden md:block">
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
        )}

        {/* Pitch */}
        <div className="flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
          <div
            ref={pitchRef}
            className={`relative rounded-xl shadow-2xl ${pendingRoster ? 'ring-2 ring-primary/50' : ''}`}
            style={{
              aspectRatio: activeScene.halfPitch ? '1050/750' : '1050/680',
              maxHeight: isMobile ? 'calc(100vh - 140px)' : 'calc(100vh - 96px)',
              maxWidth: '100%',
              width: '100%',
              cursor: pendingRoster ? 'crosshair' : undefined,
            }}
            onClick={handlePitchClick}
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              {activeScene.halfPitch ? <HalfPitchSVG /> : <PitchSVG />}
            </div>

            {/* Club crest watermark */}
            {boardCrest && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                <img
                  src={boardCrest}
                  alt="Escudo"
                  className="w-[45%] max-w-[280px] h-auto object-contain"
                  style={{ opacity: 0.12, filter: 'grayscale(20%)' }}
                  draggable={false}
                />
              </div>
            )}
            <DrawingLayer
              drawings={activeScene.drawings}
              onDrawingsChange={handleDrawingsChange}
              tool={tool}
              drawColor={drawColor}
              containerRef={pitchRef as React.RefObject<HTMLDivElement>}
              halfPitch={activeScene.halfPitch}
            />

            {/* Ball - show animated position during playback, or normal draggable */}
            {playingFrames && animBall?.visible ? (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${animBall.x}%`,
                  top: `${animBall.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15,
                  transition: 'left 1s ease-in-out, top 1s ease-in-out',
                }}
              >
                <img src={soccerBallImg} alt="Balón" className="w-7 h-7 drop-shadow-lg" draggable={false} />
              </div>
            ) : activeScene.ball.visible && (
              <DraggableElement
                x={activeScene.ball.x}
                y={activeScene.ball.y}
                containerRef={pitchRef as React.RefObject<HTMLDivElement>}
                onDragEnd={(x, y) => updateScene(s => ({ ...s, ball: { x, y, visible: true } }))}
                zIndex={15}
              >
                <img src={soccerBallImg} alt="Balón" className="w-7 h-7 drop-shadow-lg pointer-events-none" draggable={false} />
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
                <div
                  className="flex items-center gap-1"
                  onDoubleClick={(e) => { e.stopPropagation(); updateScene(s => ({ ...s, titlePos: { x: -100, y: -100 } })); }}
                  title="Doble clic para ocultar"
                >
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
                animating={playingFrames}
                overridePos={playingFrames && animOverlay ? animOverlay[p.id] : undefined}
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

        {/* Right sidebar - Legend (hidden on mobile) */}
        {!isMobile && (
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
        )}
      </div>

      {/* Mobile scene selector at bottom */}
      {isMobile && scenes.length > 1 && (
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto border-t border-border bg-card/80">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveSceneId(s.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all shrink-0 ${
                s.id === activeSceneId
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.name.length > 12 ? s.name.substring(0, 12) + '…' : s.name}
            </button>
          ))}
        </div>
      )}
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

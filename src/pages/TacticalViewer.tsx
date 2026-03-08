import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PitchSVG from '@/components/tactical/PitchSVG';
import HalfPitchSVG from '@/components/tactical/HalfPitchSVG';
import DrawingLayer from '@/components/tactical/DrawingLayer';
import soccerBallImg from '@/assets/soccer-ball.png';
import { TacticalScene, TacticalPlayer, TextLabel, AnimationFrame } from '@/components/tactical/types';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Film } from 'lucide-react';

export default function TacticalViewer() {
  const { id } = useParams<{ id: string }>();
  const pitchRef = useRef<HTMLDivElement>(null);

  const [scenes, setScenes] = useState<TacticalScene[]>([]);
  const [boardName, setBoardName] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5); // seconds

  useEffect(() => {
    async function load() {
      if (!id) { setError('No se encontró la pizarra'); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('tactical_boards')
        .select('name, scenes')
        .eq('id', id)
        .single();

      if (err || !data) {
        setError('No se pudo cargar la pizarra');
        setLoading(false);
        return;
      }

      setBoardName(data.name);
      setScenes(data.scenes as unknown as TacticalScene[]);
      setLoading(false);
    }
    load();
  }, [id]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || scenes.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % scenes.length);
    }, autoInterval * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, autoInterval, scenes.length]);

  const goNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % scenes.length);
  }, [scenes.length]);

  const goPrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + scenes.length) % scenes.length);
  }, [scenes.length]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[hsl(145,55%,20%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || scenes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[hsl(145,55%,20%)]">
        <p className="text-white text-lg font-bold">{error || 'Pizarra vacía'}</p>
      </div>
    );
  }

  const scene = scenes[activeIndex];

  return (
    <div className="h-screen flex flex-col bg-[hsl(145,55%,15%)] select-none">
      {/* Pitch area - takes up most of the screen */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div
          ref={pitchRef}
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{
            aspectRatio: scene.halfPitch ? '1050/750' : '1050/680',
            maxHeight: 'calc(100vh - 80px)',
            maxWidth: scene.halfPitch
              ? 'min(100%, calc((100vh - 80px) * 1050 / 750))'
              : 'min(100%, calc((100vh - 80px) * 1050 / 680))',
            width: '100%',
          }}
        >
          {scene.halfPitch ? <HalfPitchSVG /> : <PitchSVG />}

          {/* Club crest watermark */}
          {scene.showCrest && scene.crestUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
              <img
                src={scene.crestUrl}
                alt="Escudo"
                className="w-[45%] max-w-[280px] h-auto object-contain"
                style={{ opacity: 0.12, filter: 'grayscale(20%)' }}
                draggable={false}
              />
            </div>
          )}
          {/* Drawings */}
          <DrawingLayer
            drawings={scene.drawings}
            onDrawingsChange={() => {}}
            tool="select"
            drawColor="#ff0000"
            containerRef={pitchRef as React.RefObject<HTMLDivElement>}
            halfPitch={scene.halfPitch}
          />

          {/* Ball */}
          {scene.ball.visible && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${scene.ball.x}%`,
                top: `${scene.ball.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
              }}
            >
              <img src={soccerBallImg} alt="Balón" className="w-7 h-7 drop-shadow-lg" draggable={false} />
            </div>
          )}

          {/* Title overlay */}
          {scene.name !== '11 Inicial' && scene.titlePos?.x !== -100 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${scene.titlePos?.x ?? 88}%`,
                top: `${scene.titlePos?.y ?? 6}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 35,
              }}
            >
              <div className="flex items-center gap-1">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Escudo_UE_Sant_Pau.png/200px-Escudo_UE_Sant_Pau.png"
                  alt="Escudo"
                  className="w-10 h-10 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div
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
                  {scene.name}
                </div>
              </div>
            </div>
          )}

          {/* Labels */}
          {scene.labels.map((label: TextLabel) => (
            <div
              key={label.id}
              className="absolute pointer-events-none"
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 12,
              }}
            >
              <span
                className="whitespace-nowrap"
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
              </span>
            </div>
          ))}

          {/* Players */}
          {scene.players.filter((p: TacticalPlayer) => p.onField).map((p: TacticalPlayer) => (
            <div
              key={p.id}
              className="absolute flex flex-col items-center pointer-events-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  background: p.color,
                  color: isLight(p.color) ? '#1a1a2e' : '#ffffff',
                  border: `3px solid ${darken(p.color, 30)}`,
                  boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                {p.number}
              </div>
              {p.name && (
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
                  {p.name.length > 12 ? p.name.substring(0, 12) + '.' : p.name.toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-3" style={{ background: '#1a1a2e' }}>
        <button onClick={goPrev} className="p-2 rounded-full transition" style={{ background: '#2d2d4a', color: '#e0e0e0', border: '1px solid #3d3d5c' }}>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 flex-wrap justify-center overflow-x-auto max-w-[70vw]">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setActiveIndex(i); setAutoPlay(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              style={i === activeIndex
                ? { background: '#ffffff', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
                : { background: '#2d2d4a', color: '#c0c0d0', border: '1px solid #3d3d5c' }
              }
            >
              {s.name.length > 15 ? s.name.substring(0, 15) + '…' : s.name}
            </button>
          ))}
        </div>

        <button onClick={goNext} className="p-2 rounded-full transition" style={{ background: '#2d2d4a', color: '#e0e0e0', border: '1px solid #3d3d5c' }}>
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="w-px h-6 mx-1" style={{ background: '#3d3d5c' }} />

        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className="p-2 rounded-full transition"
          style={autoPlay
            ? { background: '#facc15', color: '#1a1a2e', border: '1px solid #eab308' }
            : { background: '#2d2d4a', color: '#e0e0e0', border: '1px solid #3d3d5c' }
          }
          title={autoPlay ? 'Pausar' : 'Auto-play'}
        >
          {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        {autoPlay && (
          <select
            value={autoInterval}
            onChange={(e) => setAutoInterval(Number(e.target.value))}
            className="text-xs font-bold rounded px-2 py-1"
            style={{ background: '#2d2d4a', color: '#e0e0e0', border: '1px solid #3d3d5c' }}
          >
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={8}>8s</option>
            <option value={10}>10s</option>
          </select>
        )}

        <button
          onClick={() => { setActiveIndex(0); setAutoPlay(false); }}
          className="p-2 rounded-full transition"
          style={{ background: '#2d2d4a', color: '#e0e0e0', border: '1px solid #3d3d5c' }}
          title="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
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

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

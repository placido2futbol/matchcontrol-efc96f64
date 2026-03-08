import { useRef, useState, useCallback } from 'react';
import { DrawingPath, DrawingTool, generateId } from './types';

interface DrawingLayerProps {
  drawings: DrawingPath[];
  onDrawingsChange: (drawings: DrawingPath[]) => void;
  tool: DrawingTool;
  drawColor: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

function getRelativePos(e: React.MouseEvent | React.TouchEvent, container: HTMLDivElement) {
  const rect = container.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

function renderPath(path: DrawingPath, viewBox: { w: number; h: number }) {
  const pts = path.points.map(p => ({ x: (p.x / 100) * viewBox.w, y: (p.y / 100) * viewBox.h }));
  if (pts.length < 2) return null;

  const strokeDash = path.type === 'dashed' ? '8 6' : undefined;
  const strokeWidth = path.type === 'free' ? 2.5 : 3;

  if (path.type === 'free') {
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return <path key={path.id} d={d} fill="none" stroke={path.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  }

  const start = pts[0];
  const end = pts[pts.length - 1];

  if (path.type === 'curved-arrow') {
    const mid = pts.length > 2 ? pts[Math.floor(pts.length / 2)] : { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 40 };
    const d = `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`;
    return (
      <g key={path.id}>
        <path d={d} fill="none" stroke={path.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <ArrowHead x={end.x} y={end.y} angle={Math.atan2(end.y - mid.y, end.x - mid.x)} color={path.color} />
      </g>
    );
  }

  // arrow or line or dashed
  const hasArrow = path.type === 'arrow';
  return (
    <g key={path.id}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={path.color} strokeWidth={strokeWidth} strokeDasharray={strokeDash} strokeLinecap="round" />
      {hasArrow && <ArrowHead x={end.x} y={end.y} angle={Math.atan2(end.y - start.y, end.x - start.x)} color={path.color} />}
    </g>
  );
}

function ArrowHead({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  const len = 12;
  const spread = 0.5;
  const x1 = x - len * Math.cos(angle - spread);
  const y1 = y - len * Math.sin(angle - spread);
  const x2 = x - len * Math.cos(angle + spread);
  const y2 = y - len * Math.sin(angle + spread);
  return <polygon points={`${x},${y} ${x1},${y1} ${x2},${y2}`} fill={color} />;
}

export default function DrawingLayer({ drawings, onDrawingsChange, tool, drawColor, containerRef }: DrawingLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPath = useRef<DrawingPath | null>(null);
  const VB = { w: 1050, h: 680 };

  const isDrawTool = tool !== 'select' && tool !== 'eraser';

  const handleStart = useCallback((e: React.MouseEvent) => {
    if (!isDrawTool || !containerRef.current) return;
    e.preventDefault();
    const pos = getRelativePos(e, containerRef.current);
    currentPath.current = { id: generateId(), type: tool as any, points: [pos], color: drawColor };
    setIsDrawing(true);
  }, [tool, drawColor, isDrawTool, containerRef]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentPath.current || !containerRef.current) return;
    const pos = getRelativePos(e, containerRef.current);
    if (currentPath.current.type === 'free') {
      currentPath.current.points.push(pos);
    } else {
      // For line-based tools keep only start + current end
      currentPath.current.points = [currentPath.current.points[0], pos];
      if (currentPath.current.type === 'curved-arrow' && currentPath.current.points.length < 3) {
        // Will use midpoint calculation in render
      }
    }
    // Force re-render
    onDrawingsChange([...drawings]);
  }, [isDrawing, drawings, onDrawingsChange, containerRef]);

  const handleEnd = useCallback(() => {
    if (!isDrawing || !currentPath.current) return;
    if (currentPath.current.points.length >= 2) {
      onDrawingsChange([...drawings, currentPath.current]);
    }
    currentPath.current = null;
    setIsDrawing(false);
  }, [isDrawing, drawings, onDrawingsChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (tool !== 'eraser' || !containerRef.current) return;
    const pos = getRelativePos(e, containerRef.current);
    // Remove closest drawing
    const threshold = 5;
    const filtered = drawings.filter(d => {
      return !d.points.some(p => Math.abs(p.x - pos.x) < threshold && Math.abs(p.y - pos.y) < threshold);
    });
    if (filtered.length !== drawings.length) {
      onDrawingsChange(filtered);
    }
  }, [tool, drawings, onDrawingsChange, containerRef]);

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ 
        zIndex: isDrawTool || tool === 'eraser' ? 25 : 5, 
        pointerEvents: isDrawTool || tool === 'eraser' ? 'auto' : 'none',
        cursor: tool === 'eraser' ? 'crosshair' : isDrawTool ? 'crosshair' : 'default',
      }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onClick={handleClick}
    >
      {drawings.map(d => renderPath(d, VB))}
      {isDrawing && currentPath.current && renderPath(currentPath.current, VB)}
    </svg>
  );
}

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { CallupPlayer } from '@/components/callups/types';
import { FORMATIONS } from '@/components/callups/types';

export function useSquadManager(players: CallupPlayer[], setPlayers: React.Dispatch<React.SetStateAction<CallupPlayer[]>>) {
  const [formation, setFormation] = useState('4-3-3');
  const [pitchSlots, setPitchSlots] = useState<(number | null)[]>(new Array(11).fill(null));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [customPositions, setCustomPositions] = useState<Record<number, { x: number; y: number }>>({});

  const [dragOffset, setDragOffset] = useState<{ slot: number; dx: number; dy: number } | null>(null);
  const draggingSlot = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number; slotX: number; slotY: number } | null>(null);

  const [panelDragPlayer, setPanelDragPlayer] = useState<number | null>(null);
  const [panelDragPos, setPanelDragPos] = useState<{ x: number; y: number } | null>(null);
  const panelDragStartPos = useRef<{ x: number; y: number } | null>(null);
  const panelDragStarted = useRef(false);

  useEffect(() => { setCustomPositions({}); }, [formation]);

  const formationPositions = FORMATIONS[formation]?.positions || FORMATIONS['4-3-3'].positions;

  const getSlotPosition = useCallback((slotIdx: number) => {
    return customPositions[slotIdx] || formationPositions[slotIdx];
  }, [customPositions, formationPositions]);

  const starters = useMemo(() => {
    return pitchSlots
      .filter((idx): idx is number => idx !== null)
      .map(idx => players[idx])
      .filter(Boolean);
  }, [pitchSlots, players]);

  const substitutePlayers = useMemo(() => {
    return players.map((p, i) => ({ ...p, _idx: i })).filter(p => p.status === 'substitute');
  }, [players]);

  const desconvocados = useMemo(() => {
    return players.map((p, i) => ({ ...p, _idx: i })).filter(p => p.status === 'not_called' && !pitchSlots.includes(p._idx));
  }, [players, pitchSlots]);

  const assignToSlot = (playerIdx: number) => {
    if (selectedSlot === null) return;
    const newSlots = pitchSlots.map(s => s === playerIdx ? null : s);
    newSlots[selectedSlot] = playerIdx;
    setPitchSlots(newSlots);
    setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, status: 'starter' } : p));
    setSelectedSlot(null);
  };

  const removeFromPitch = (slotIdx: number) => {
    const playerIdx = pitchSlots[slotIdx];
    if (playerIdx !== null) {
      setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, status: 'not_called' } : p));
    }
    setPitchSlots(prev => prev.map((s, i) => i === slotIdx ? null : s));
  };

  const toggleSubstitute = (playerIdx: number) => {
    if (pitchSlots.includes(playerIdx)) return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== playerIdx) return p;
      return { ...p, status: p.status === 'substitute' ? 'not_called' : 'substitute' };
    }));
  };

  const removeFromList = (playerIdx: number) => {
    if (pitchSlots.includes(playerIdx)) {
      setPitchSlots(prev => prev.map(s => s === playerIdx ? null : s));
    }
    setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, status: 'not_called' } : p));
  };

  // Pitch token drag
  const handleTokenPointerDown = useCallback((e: React.PointerEvent, slotIdx: number, pitchRef: React.RefObject<HTMLDivElement>) => {
    if (pitchSlots[slotIdx] === null) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = getSlotPosition(slotIdx);
    draggingSlot.current = slotIdx;
    dragStart.current = { x: e.clientX, y: e.clientY, slotX: pos.x, slotY: pos.y };
    setDragOffset(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pitchSlots, getSlotPosition]);

  const handleTokenPointerMove = useCallback((e: React.PointerEvent, pitchRef: React.RefObject<HTMLDivElement>) => {
    if (draggingSlot.current === null || !dragStart.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      setDragOffset({ slot: draggingSlot.current, dx, dy });
    }
  }, []);

  const handleTokenPointerUp = useCallback((e: React.PointerEvent, pitchRef: React.RefObject<HTMLDivElement>) => {
    if (draggingSlot.current === null || !dragStart.current || !pitchRef.current) {
      draggingSlot.current = null;
      dragStart.current = null;
      setDragOffset(null);
      return;
    }
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    const wasDrag = Math.abs(dx) > 2 || Math.abs(dy) > 2;
    const slot = draggingSlot.current;
    if (wasDrag) {
      const newX = Math.max(5, Math.min(95, dragStart.current.slotX + dx));
      const newY = Math.max(5, Math.min(95, dragStart.current.slotY + dy));
      setCustomPositions(prev => ({ ...prev, [slot]: { x: Math.round(newX), y: Math.round(newY) } }));
    }
    draggingSlot.current = null;
    dragStart.current = null;
    setDragOffset(null);
  }, []);

  // Panel drag
  const handlePanelDragStart = useCallback((e: React.PointerEvent, playerIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    panelDragStartPos.current = { x: e.clientX, y: e.clientY };
    panelDragStarted.current = false;
    setPanelDragPlayer(playerIdx);
    setPanelDragPos({ x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePanelDragMove = useCallback((e: React.PointerEvent) => {
    if (panelDragPlayer === null || !panelDragStartPos.current) return;
    const dx = e.clientX - panelDragStartPos.current.x;
    const dy = e.clientY - panelDragStartPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) panelDragStarted.current = true;
    if (panelDragStarted.current) {
      setPanelDragPos({ x: e.clientX, y: e.clientY });
    }
  }, [panelDragPlayer]);

  const handlePanelDragEnd = useCallback((e: React.PointerEvent, pitchRef: React.RefObject<HTMLDivElement>) => {
    if (panelDragPlayer === null) return;
    const playerIdx = panelDragPlayer;
    const wasDrag = panelDragStarted.current;

    setPanelDragPlayer(null);
    setPanelDragPos(null);
    panelDragStartPos.current = null;
    panelDragStarted.current = false;

    if (!wasDrag || !pitchRef.current) return;

    const rect = pitchRef.current.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
      const dropX = ((e.clientX - rect.left) / rect.width) * 100;
      const dropY = ((e.clientY - rect.top) / rect.height) * 100;

      let bestSlot = -1;
      let bestDist = Infinity;
      formationPositions.forEach((_pos, slotIdx) => {
        if (pitchSlots[slotIdx] !== null) return;
        const slotPos = getSlotPosition(slotIdx);
        const dist = Math.hypot(slotPos.x - dropX, slotPos.y - dropY);
        if (dist < bestDist) { bestDist = dist; bestSlot = slotIdx; }
      });

      if (bestSlot >= 0) {
        const newSlots = pitchSlots.map(s => s === playerIdx ? null : s);
        newSlots[bestSlot] = playerIdx;
        setPitchSlots(newSlots);
        setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, status: 'starter' } : p));
      }
    }
  }, [panelDragPlayer, pitchSlots, formationPositions, getSlotPosition, setPlayers]);

  const resetPanelDrag = useCallback(() => {
    setPanelDragPlayer(null);
    setPanelDragPos(null);
    panelDragStartPos.current = null;
    panelDragStarted.current = false;
  }, []);

  const initSlotsFromPlayers = (calPlayers: CallupPlayer[]) => {
    const starterIndices = calPlayers
      .map((p, i) => p.status === 'starter' ? i : -1)
      .filter(i => i >= 0);
    const slots = new Array(11).fill(null);
    starterIndices.forEach((playerIdx, slotIdx) => {
      if (slotIdx < 11) slots[slotIdx] = playerIdx;
    });
    setPitchSlots(slots);
  };

  return {
    formation, setFormation,
    pitchSlots, setPitchSlots,
    selectedSlot, setSelectedSlot,
    customPositions, formationPositions,
    getSlotPosition,
    dragOffset, draggingSlot,
    starters, substitutePlayers, desconvocados,
    assignToSlot, removeFromPitch, toggleSubstitute, removeFromList,
    handleTokenPointerDown, handleTokenPointerMove, handleTokenPointerUp,
    panelDragPlayer, panelDragPos, panelDragStarted,
    handlePanelDragStart, handlePanelDragMove, handlePanelDragEnd, resetPanelDrag,
    initSlotsFromPlayers,
  };
}

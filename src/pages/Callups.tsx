import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Download, Calendar, Clock, FileText, X, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CallupPlayer {
  player_name: string;
  dorsal: string;
  photo_url: string;
  status: 'starter' | 'substitute' | 'not_called';
  position_order: number;
}

interface Callup {
  id: string;
  team_id: string | null;
  match_date: string | null;
  match_time: string | null;
  opponent: string;
  notes: string;
  created_at: string;
  players: CallupPlayer[];
}

const FORMATIONS: Record<string, { label: string; positions: { x: number; y: number }[] }> = {
  '4-3-3': {
    label: '4-3-3',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 25, y: 50 }, { x: 50, y: 46 }, { x: 75, y: 50 },
      { x: 20, y: 26 }, { x: 50, y: 20 }, { x: 80, y: 26 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 15, y: 48 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 48 },
      { x: 35, y: 24 }, { x: 65, y: 24 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 72 }, { x: 50, y: 74 }, { x: 75, y: 72 },
      { x: 10, y: 50 }, { x: 30, y: 48 }, { x: 50, y: 45 }, { x: 70, y: 48 }, { x: 90, y: 50 },
      { x: 35, y: 24 }, { x: 65, y: 24 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 35, y: 54 }, { x: 65, y: 54 },
      { x: 20, y: 36 }, { x: 50, y: 32 }, { x: 80, y: 36 },
      { x: 50, y: 16 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 72 }, { x: 50, y: 74 }, { x: 75, y: 72 },
      { x: 15, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 85, y: 50 },
      { x: 20, y: 24 }, { x: 50, y: 20 }, { x: 80, y: 24 },
    ],
  },
};

type EditorTab = 'match' | 'players' | 'export';

export default function Callups() {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { textClass, btnClass } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<CallupPlayer[]>([]);
  const [formation, setFormation] = useState('4-3-3');
  const [activeTab, setActiveTab] = useState<EditorTab>('players');

  const [pitchSlots, setPitchSlots] = useState<(number | null)[]>(new Array(11).fill(null));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Drag state for pitch tokens
  const pitchRef = useRef<HTMLDivElement>(null);
  const draggingSlot = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number; slotX: number; slotY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ slot: number; dx: number; dy: number } | null>(null);

  // Drag from panel to pitch
  const [panelDragPlayer, setPanelDragPlayer] = useState<number | null>(null);
  const [panelDragPos, setPanelDragPos] = useState<{ x: number; y: number } | null>(null);
  const panelDragStartPos = useRef<{ x: number; y: number } | null>(null);
  const panelDragStarted = useRef(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const fetchCallups = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('callups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Error cargando convocatorias'); return; }

    const callupsWithPlayers: Callup[] = [];
    for (const c of data || []) {
      const { data: pData } = await supabase
        .from('callup_players')
        .select('*')
        .eq('callup_id', c.id)
        .order('position_order');
      callupsWithPlayers.push({
        id: c.id,
        team_id: c.team_id,
        match_date: c.match_date,
        match_time: c.match_time,
        opponent: c.opponent || '',
        notes: c.notes || '',
        created_at: c.created_at,
        players: (pData || []).map(p => ({
          player_name: p.player_name,
          dorsal: p.dorsal || '',
          photo_url: p.photo_url || '',
          status: p.status as CallupPlayer['status'],
          position_order: p.position_order,
        })),
      });
    }
    setCallups(callupsWithPlayers);
    setLoading(false);
  };

  useEffect(() => { fetchCallups(); }, [user]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const loadTeamPlayers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setPlayers(team.players.map((p, i) => ({
      player_name: p.name,
      dorsal: p.dorsal,
      photo_url: p.photo_url,
      status: 'not_called',
      position_order: i,
    })));
    setPitchSlots(new Array(11).fill(null));
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    if (!editId) loadTeamPlayers(teamId);
  };

  const newCallup = () => {
    setEditId(null);
    setSelectedTeamId('');
    setMatchDate('');
    setMatchTime('');
    setOpponent('');
    setNotes('');
    setPlayers([]);
    setPitchSlots(new Array(11).fill(null));
    setFormation('4-3-3');
    setActiveTab('players');
    setView('editor');
  };

  const editCallup = (c: Callup) => {
    setEditId(c.id);
    setSelectedTeamId(c.team_id || '');
    setMatchDate(c.match_date || '');
    setMatchTime(c.match_time || '');
    setOpponent(c.opponent);
    setNotes(c.notes);
    setPlayers(c.players);
    const starterIndices = c.players
      .map((p, i) => p.status === 'starter' ? i : -1)
      .filter(i => i >= 0);
    const slots = new Array(11).fill(null);
    starterIndices.forEach((playerIdx, slotIdx) => {
      if (slotIdx < 11) slots[slotIdx] = playerIdx;
    });
    setPitchSlots(slots);
    setFormation('4-3-3');
    setActiveTab('players');
    setView('editor');
  };

  const saveCallup = async () => {
    if (!user) return;
    if (!selectedTeamId) { toast.error('Selecciona un equipo'); return; }

    const updatedPlayers = players.map((p, i) => {
      const isOnPitch = pitchSlots.includes(i);
      if (isOnPitch) return { ...p, status: 'starter' as const };
      return p;
    });

    const calledPlayers = updatedPlayers.filter(p => p.status !== 'not_called');

    if (editId) {
      await supabase.from('callups').update({
        team_id: selectedTeamId,
        match_date: matchDate || null,
        match_time: matchTime || null,
        opponent,
        notes,
      }).eq('id', editId);
      await supabase.from('callup_players').delete().eq('callup_id', editId);
      if (calledPlayers.length > 0) {
        await supabase.from('callup_players').insert(
          calledPlayers.map((p, i) => ({
            callup_id: editId,
            player_name: p.player_name,
            dorsal: p.dorsal,
            photo_url: p.photo_url,
            status: p.status,
            position_order: i,
          }))
        );
      }
    } else {
      const { data, error } = await supabase.from('callups').insert({
        user_id: user.id,
        team_id: selectedTeamId,
        match_date: matchDate || null,
        match_time: matchTime || null,
        opponent,
        notes,
      }).select().single();
      if (error || !data) { toast.error('Error guardando convocatoria'); return; }
      if (calledPlayers.length > 0) {
        await supabase.from('callup_players').insert(
          calledPlayers.map((p, i) => ({
            callup_id: data.id,
            player_name: p.player_name,
            dorsal: p.dorsal,
            photo_url: p.photo_url,
            status: p.status,
            position_order: i,
          }))
        );
      }
      setEditId(data.id);
    }
    toast.success('Convocatoria guardada');
    await fetchCallups();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('callup_players').delete().eq('callup_id', deleteId);
    await supabase.from('callups').delete().eq('id', deleteId);
    toast.success('Convocatoria eliminada');
    setDeleteId(null);
    if (view === 'editor') setView('list');
    await fetchCallups();
  };

  const starters = useMemo(() => {
    return pitchSlots
      .filter((idx): idx is number => idx !== null)
      .map(idx => players[idx])
      .filter(Boolean);
  }, [pitchSlots, players]);

  const substitutePlayers = players
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => p.status === 'substitute');

  const desconvocados = players
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => p.status === 'not_called' && !pitchSlots.includes(p._idx));

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

  // Custom positions per slot (allow dragging to override formation positions)
  const [customPositions, setCustomPositions] = useState<Record<number, { x: number; y: number }>>({});
  
  // Reset custom positions when formation changes
  useEffect(() => {
    setCustomPositions({});
  }, [formation]);

  const formationPositions = FORMATIONS[formation]?.positions || FORMATIONS['4-3-3'].positions;

  const getSlotPosition = (slotIdx: number) => {
    if (customPositions[slotIdx]) return customPositions[slotIdx];
    return formationPositions[slotIdx];
  };

  // Drag handlers for pitch tokens
  const handleTokenPointerDown = useCallback((e: React.PointerEvent, slotIdx: number) => {
    if (pitchSlots[slotIdx] === null) return; // only drag filled slots
    e.stopPropagation();
    e.preventDefault();
    const pos = getSlotPosition(slotIdx);
    draggingSlot.current = slotIdx;
    dragStart.current = { x: e.clientX, y: e.clientY, slotX: pos.x, slotY: pos.y };
    setDragOffset(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pitchSlots, customPositions, formationPositions]);

  const handleTokenPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingSlot.current === null || !dragStart.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      setDragOffset({ slot: draggingSlot.current, dx, dy });
    }
  }, []);

  const handleTokenPointerUp = useCallback((e: React.PointerEvent) => {
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

  const downloadImage = async () => {
    if (!previewRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `convocatoria-${matchDate || 'sin-fecha'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagen descargada');
    } catch {
      toast.error('Error generando imagen');
    }
  };

  const shareToWhatsApp = async () => {
    if (!previewRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(previewRef.current, { backgroundColor: null, scale: 2 });
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `convocatoria-${matchDate || 'sin-fecha'}.png`, { type: 'image/png' });
          try {
            await navigator.share({ title: `Convocatoria ${opponent ? 'vs ' + opponent : ''}`, files: [file] });
            toast.success('Compartido');
          } catch { fallbackWhatsApp(); }
        }, 'image/png');
      } else {
        fallbackWhatsApp();
      }
    } catch {
      toast.error('Error generando imagen');
    }
  };

  const fallbackWhatsApp = () => {
    const team = teams.find(t => t.id === selectedTeamId);
    let text = `📋 *CONVOCATORIA*\n`;
    if (team) text += `🏟️ ${team.name}\n`;
    if (opponent) text += `⚽ vs ${opponent}\n`;
    if (matchDate) text += `📅 ${matchDate}`;
    if (matchTime) text += ` ⏰ ${matchTime}h`;
    text += '\n\n';
    if (starters.length > 0) {
      text += `*TITULARES (${starters.length}):*\n`;
      starters.forEach(p => { text += `  ${p.dorsal} - ${p.player_name}\n`; });
      text += '\n';
    }
    if (substitutePlayers.length > 0) {
      text += `*SUPLENTES (${substitutePlayers.length}):*\n`;
      substitutePlayers.forEach(p => { text += `  ${p.dorsal} - ${p.player_name}\n`; });
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = () => {
    const team = teams.find(t => t.id === selectedTeamId);
    let text = `📋 CONVOCATORIA\n`;
    if (team) text += `🏟️ ${team.name}\n`;
    if (opponent) text += `⚽ vs ${opponent}\n`;
    if (matchDate) text += `📅 ${matchDate}`;
    if (matchTime) text += ` ⏰ ${matchTime}h`;
    text += '\n\n';
    if (starters.length > 0) {
      text += `TITULARES (${starters.length}):\n`;
      starters.forEach(p => { text += `  ${p.dorsal} - ${p.player_name}\n`; });
      text += '\n';
    }
    if (substitutePlayers.length > 0) {
      text += `SUPLENTES (${substitutePlayers.length}):\n`;
      substitutePlayers.forEach(p => { text += `  ${p.dorsal} - ${p.player_name}\n`; });
    }
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const teamForPreview = (callup?: Callup) => {
    const tId = callup?.team_id || selectedTeamId;
    return teams.find(t => t.id === tId);
  };

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className={btnClass}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className={`font-display text-xl sm:text-2xl ${textClass}`}>📋 Convocatorias</h1>
          </div>
          <Button onClick={newCallup} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : callups.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No hay convocatorias</p>
              <p className="text-sm text-muted-foreground/70 mt-1">¡Crea tu primera convocatoria!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {callups.map(c => {
              const team = teamForPreview(c);
              const st = c.players.filter(p => p.status === 'starter').length;
              const su = c.players.filter(p => p.status === 'substitute').length;
              return (
                <div key={c.id} className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                  onClick={() => editCallup(c)}>
                  <div className="flex items-center gap-3">
                    {team?.crest_url && <img src={team.crest_url} alt="" className="h-10 w-10 object-contain" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{team?.name || 'Equipo'}</span>
                        {c.opponent && <span className="text-muted-foreground text-xs">vs {c.opponent}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {c.match_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.match_date}</span>}
                        {c.match_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.match_time}</span>}
                        <span>{st} titulares · {su} suplentes</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setDeleteId(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar convocatoria?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── EDITOR VIEW ──
  const team = teamForPreview();

  // Render pitch component (shared between mobile and desktop)
  const renderPitch = () => (
    <div
      ref={pitchRef}
      className="relative w-full h-full rounded-xl overflow-hidden select-none touch-none"
      style={{
        background: 'linear-gradient(180deg, hsl(145, 50%, 22%) 0%, hsl(145, 50%, 28%) 8.33%, hsl(145, 50%, 24%) 8.33%, hsl(145, 50%, 28%) 16.66%, hsl(145, 50%, 22%) 16.66%, hsl(145, 50%, 28%) 25%, hsl(145, 50%, 24%) 25%, hsl(145, 50%, 28%) 33.33%, hsl(145, 50%, 22%) 33.33%, hsl(145, 50%, 28%) 41.66%, hsl(145, 50%, 24%) 41.66%, hsl(145, 50%, 28%) 50%, hsl(145, 50%, 22%) 50%, hsl(145, 50%, 28%) 58.33%, hsl(145, 50%, 24%) 58.33%, hsl(145, 50%, 28%) 66.66%, hsl(145, 50%, 22%) 66.66%, hsl(145, 50%, 28%) 75%, hsl(145, 50%, 24%) 75%, hsl(145, 50%, 28%) 83.33%, hsl(145, 50%, 22%) 83.33%, hsl(145, 50%, 28%) 91.66%, hsl(145, 50%, 24%) 91.66%, hsl(145, 50%, 28%) 100%)',
      }}
      onClick={() => setSelectedSlot(null)}
    >
      {/* Pitch markings SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="none">
        {/* Field outline */}
        <rect x="5" y="4" width="90" height="122" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
        {/* Center line */}
        <line x1="5" y1="65" x2="95" y2="65" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        {/* Center circle */}
        <circle cx="50" cy="65" r="10" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="65" r="0.6" fill="rgba(255,255,255,0.45)" />
        {/* Top penalty area */}
        <rect x="22" y="4" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="34" y="4" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="17" r="0.6" fill="rgba(255,255,255,0.45)" />
        <path d="M 36 24 A 8 8 0 0 0 64 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        {/* Goal top */}
        <rect x="40" y="1" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" rx="0.5" />
        {/* Bottom penalty area */}
        <rect x="22" y="106" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <rect x="34" y="119" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <circle cx="50" cy="113" r="0.6" fill="rgba(255,255,255,0.45)" />
        <path d="M 36 106 A 8 8 0 0 1 64 106" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        {/* Goal bottom */}
        <rect x="40" y="126" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" rx="0.5" />
        {/* Corner arcs */}
        <path d="M 5 7 A 3 3 0 0 1 8 4" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 92 4 A 3 3 0 0 1 95 7" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 8 126 A 3 3 0 0 1 5 123" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
        <path d="M 95 123 A 3 3 0 0 1 92 126" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
      </svg>

      {/* Player tokens */}
      {formationPositions.map((defaultPos, slotIdx) => {
        const playerIdx = pitchSlots[slotIdx];
        const player = playerIdx !== null ? players[playerIdx] : null;
        const isSelected = selectedSlot === slotIdx;
        const pos = getSlotPosition(slotIdx);

        // Apply drag offset if currently dragging this slot
        let displayX = pos.x;
        let displayY = pos.y;
        if (dragOffset && dragOffset.slot === slotIdx) {
          displayX = Math.max(5, Math.min(95, pos.x + dragOffset.dx));
          displayY = Math.max(5, Math.min(95, pos.y + dragOffset.dy));
        }

        return (
          <div
            key={slotIdx}
            className={`absolute flex flex-col items-center ${player ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            style={{
              left: `${displayX}%`,
              top: `${(displayY / 100) * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: (dragOffset?.slot === slotIdx) ? 50 : isSelected ? 20 : 10,
              transition: (dragOffset?.slot === slotIdx) ? 'none' : 'left 0.3s ease, top 0.3s ease',
            }}
            onPointerDown={(e) => {
              if (player) {
                handleTokenPointerDown(e, slotIdx);
              }
            }}
            onPointerMove={handleTokenPointerMove}
            onPointerUp={(e) => {
              if (draggingSlot.current !== null) {
                handleTokenPointerUp(e);
              } else if (!player) {
                e.stopPropagation();
                setSelectedSlot(isSelected ? null : slotIdx);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!player && draggingSlot.current === null) {
                setSelectedSlot(isSelected ? null : slotIdx);
              }
            }}
          >
            {player ? (
              <>
                <div
                  className="relative rounded-full border-[2.5px] border-white/90 shadow-lg flex items-center justify-center text-white font-black overflow-hidden"
                  style={{
                    width: isMobile ? 38 : 46,
                    height: isMobile ? 38 : 46,
                    background: 'linear-gradient(160deg, #d4a017 0%, #c0392b 45%, #d4a017 100%)',
                    fontSize: isMobile ? 15 : 19,
                    boxShadow: '0 3px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  {player.photo_url ? (
                    <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="drop-shadow-md">{player.dorsal || '?'}</span>
                  )}
                </div>
                <span
                  className="text-white font-black text-center leading-tight drop-shadow-lg uppercase tracking-wide mt-0.5"
                  style={{ fontSize: isMobile ? 8 : 10, maxWidth: isMobile ? 54 : 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {player.player_name.split(' ').pop()}
                </span>
              </>
            ) : (
              <div
                className={`rounded-full border-2 border-dashed flex items-center justify-center text-white/60 font-bold transition-all ${
                  isSelected ? 'border-yellow-400 bg-yellow-400/30 scale-110 shadow-lg shadow-yellow-400/30' : 'border-white/30 bg-white/10 hover:bg-white/20'
                }`}
                style={{ width: isMobile ? 34 : 42, height: isMobile ? 34 : 42, fontSize: isMobile ? 16 : 20 }}
              >
                +
              </div>
            )}
          </div>
        );
      })}

      {/* Hint */}
      <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
        <p className="text-[8px] sm:text-[9px] text-white/40 font-medium">
          {selectedSlot !== null
            ? '👆 Selecciona un jugador del panel'
            : 'Toca una posición vacía · Arrastra jugadores para moverlos'}
        </p>
      </div>
    </div>
  );

  // Render right panel content
  const renderPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Team selector */}
      <div className="px-3 py-2 border-b shrink-0">
        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="▼ Selecciona equipo" />
          </SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  {t.crest_url && <img src={t.crest_url} alt="" className="h-4 w-4 object-contain" />}
                  <span className="text-xs">{t.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {([
          { key: 'match' as EditorTab, icon: '⚽', label: 'Partido' },
          { key: 'players' as EditorTab, icon: '👥', label: 'Jugadores' },
          { key: 'export' as EditorTab, icon: '📤', label: 'Exportar' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'match' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Rival</label>
              <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Nombre del rival" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
                <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora</label>
                <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="h-8 text-xs" />
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                SUPLENTES ({substitutePlayers.length})
              </h3>
              <div className="space-y-1.5">
                {substitutePlayers.map(p => (
                  <div key={p._idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white cursor-pointer transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
                    onClick={() => toggleSubstitute(p._idx)}>
                    <span className="text-sm font-black w-7">{p.dorsal}</span>
                    <span className="text-xs font-bold uppercase flex-1 truncate">{p.player_name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFromList(p._idx); }} className="text-white/60 hover:text-white">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                      selectedSlot !== null
                        ? 'bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/40 shadow-sm shadow-yellow-500/10'
                        : 'bg-muted/50 hover:bg-muted/80'
                    }`}
                    onClick={() => {
                      if (selectedSlot !== null) {
                        assignToSlot(p._idx);
                      } else {
                        toggleSubstitute(p._idx);
                      }
                    }}>
                    <span className="text-sm font-black w-7 text-muted-foreground">{p.dorsal}</span>
                    <span className="text-xs font-bold uppercase flex-1 truncate text-muted-foreground">{p.player_name}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFromList(p._idx); }} className="text-muted-foreground/30 hover:text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
            <div ref={previewRef} className="rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
              <div className="text-center mb-4">
                {team?.crest_url && <img src={team.crest_url} alt="" className="h-12 w-12 mx-auto mb-2 object-contain" />}
                <h2 className="text-sm font-black tracking-wider uppercase">{team?.name || 'Equipo'}</h2>
                <p className="text-white/50 text-[10px] tracking-widest mt-0.5">CONVOCATORIA</p>
                {opponent && <p className="text-white/70 text-[11px] mt-1">vs {opponent}</p>}
                <div className="flex items-center justify-center gap-3 text-white/40 text-[10px] mt-1">
                  {matchDate && <span>📅 {matchDate}</span>}
                  {matchTime && <span>⏰ {matchTime}h</span>}
                </div>
              </div>
              {starters.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 border-b border-white/10 pb-1">Titulares ({starters.length})</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {starters.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center text-[9px] font-black shrink-0">{p.dorsal || '?'}</div>
                        <span className="text-[9px] font-semibold truncate">{p.player_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {substitutePlayers.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-white/10 pb-1">Suplentes ({substitutePlayers.length})</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {substitutePlayers.map(p => (
                      <div key={p._idx} className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1.5">
                        <div className="h-6 w-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[9px] font-black shrink-0">{p.dorsal || '?'}</div>
                        <span className="text-[9px] font-semibold truncate">{p.player_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button className="w-full" size="sm" onClick={downloadImage}>
                <Download className="h-4 w-4 mr-2" />Descargar imagen
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={shareToWhatsApp}>
                <Share2 className="h-4 w-4 mr-2" />Compartir por WhatsApp
              </Button>
              <Button variant="outline" className="w-full" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />Copiar texto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-2 sm:px-3 py-2 border-b bg-card shrink-0">
        {team?.crest_url && <img src={team.crest_url} alt="" className="h-6 w-6 sm:h-7 sm:w-7 object-contain" />}
        <Select value={formation} onValueChange={setFormation}>
          <SelectTrigger className="w-[70px] sm:w-20 h-7 text-[10px] sm:text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(FORMATIONS).map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate">{team?.name || 'Equipo'}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={newCallup}><Plus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveCallup}><Save className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editId && setDeleteId(editId)}><Trash2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('list')}><ArrowLeft className="h-4 w-4" /></Button>
      </div>

      {/* Main content - responsive */}
      {isMobile ? (
        // Mobile: vertical stack - pitch on top, panel below
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 p-2" style={{ height: '55%' }}>
            {renderPitch()}
          </div>
          <div className="flex-1 border-t overflow-hidden bg-card">
            {renderPanel()}
          </div>
        </div>
      ) : (
        // Desktop: side by side
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-3 min-w-0">
            <div className="w-full max-w-lg" style={{ aspectRatio: '3/4' }}>
              {renderPitch()}
            </div>
          </div>
          <div className="w-80 lg:w-96 border-l bg-card flex flex-col shrink-0 overflow-hidden">
            {renderPanel()}
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar convocatoria?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

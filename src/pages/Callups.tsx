import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Users, Download, Calendar, Clock, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
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
      // GK
      { x: 50, y: 90 },
      // DEF (4)
      { x: 15, y: 72 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 72 },
      // MID (3)
      { x: 25, y: 52 }, { x: 50, y: 48 }, { x: 75, y: 52 },
      // FWD (3)
      { x: 20, y: 25 }, { x: 50, y: 18 }, { x: 80, y: 25 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    positions: [
      { x: 50, y: 90 },
      { x: 15, y: 72 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 72 },
      { x: 15, y: 48 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 48 },
      { x: 35, y: 22 }, { x: 65, y: 22 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    positions: [
      { x: 50, y: 90 },
      { x: 25, y: 74 }, { x: 50, y: 76 }, { x: 75, y: 74 },
      { x: 10, y: 50 }, { x: 30, y: 48 }, { x: 50, y: 45 }, { x: 70, y: 48 }, { x: 90, y: 50 },
      { x: 35, y: 22 }, { x: 65, y: 22 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    positions: [
      { x: 50, y: 90 },
      { x: 15, y: 72 }, { x: 38, y: 75 }, { x: 62, y: 75 }, { x: 85, y: 72 },
      { x: 35, y: 55 }, { x: 65, y: 55 },
      { x: 20, y: 35 }, { x: 50, y: 32 }, { x: 80, y: 35 },
      { x: 50, y: 15 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    positions: [
      { x: 50, y: 90 },
      { x: 25, y: 74 }, { x: 50, y: 76 }, { x: 75, y: 74 },
      { x: 15, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 85, y: 50 },
      { x: 20, y: 22 }, { x: 50, y: 18 }, { x: 80, y: 22 },
    ],
  },
};

type EditorTab = 'match' | 'players' | 'list' | 'export';

export default function Callups() {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { textClass, btnClass } = useTheme();
  const navigate = useNavigate();

  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Editor state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<CallupPlayer[]>([]);
  const [formation, setFormation] = useState('4-3-3');
  const [activeTab, setActiveTab] = useState<EditorTab>('players');

  // For assigning starters to pitch positions
  const [pitchSlots, setPitchSlots] = useState<(number | null)[]>(new Array(11).fill(null));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

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
    // Rebuild pitch slots from starters
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

    // Update statuses from pitch slots
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
    await fetchCallups();
  };

  const starters = useMemo(() => {
    return pitchSlots
      .filter((idx): idx is number => idx !== null)
      .map(idx => players[idx])
      .filter(Boolean);
  }, [pitchSlots, players]);

  const substitutes = players.filter(p => p.status === 'substitute');
  const notCalled = players.filter(p => p.status !== 'starter' && p.status !== 'substitute' && !pitchSlots.includes(players.indexOf(p)));

  // Assign a player to a pitch slot
  const assignToSlot = (playerIdx: number) => {
    if (selectedSlot === null) return;
    // Remove player from any existing slot
    const newSlots = pitchSlots.map(s => s === playerIdx ? null : s);
    newSlots[selectedSlot] = playerIdx;
    setPitchSlots(newSlots);
    // Mark as starter
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
    // If already on pitch, ignore
    if (pitchSlots.includes(playerIdx)) return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== playerIdx) return p;
      return { ...p, status: p.status === 'substitute' ? 'not_called' : 'substitute' };
    }));
  };

  const removeFromList = (playerIdx: number) => {
    // Remove from pitch if on pitch
    if (pitchSlots.includes(playerIdx)) {
      setPitchSlots(prev => prev.map(s => s === playerIdx ? null : s));
    }
    setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, status: 'not_called' } : p));
  };

  const formationPositions = FORMATIONS[formation]?.positions || FORMATIONS['4-3-3'].positions;

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

  // ── EDITOR VIEW (like reference image) ──
  const team = teamForPreview();

  // Players not on pitch and not substitute = available for assignment
  const availablePlayers = players
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => !pitchSlots.includes(p._idx) && p.status !== 'substitute');

  const substitutePlayers = players
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => p.status === 'substitute');

  const desconvocados = players
    .map((p, i) => ({ ...p, _idx: i }))
    .filter(p => p.status === 'not_called' && !pitchSlots.includes(p._idx));

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-card shrink-0">
        {team?.crest_url && <img src={team.crest_url} alt="" className="h-6 w-6 object-contain" />}

        <Select value={formation} onValueChange={setFormation}>
          <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(FORMATIONS).map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs font-medium truncate">{team?.name || 'Equipo'}</span>

        <div className="flex-1" />

        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="Equipo" /></SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-1.5">
                  {t.crest_url && <img src={t.crest_url} alt="" className="h-4 w-4 object-contain" />}
                  <span className="text-xs">{t.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveCallup} title="Guardar">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('list')} title="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Football pitch */}
        <div className="flex-1 flex items-center justify-center p-2 min-w-0">
          <div className="relative w-full max-w-lg aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-b from-green-600 via-green-500 to-green-600 border-2 border-green-700 shadow-lg">
            {/* Pitch markings */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" preserveAspectRatio="none">
              {/* Outer border */}
              <rect x="3" y="3" width="94" height="124" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
              {/* Center line */}
              <line x1="3" y1="65" x2="97" y2="65" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              {/* Center circle */}
              <circle cx="50" cy="65" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              <circle cx="50" cy="65" r="0.8" fill="rgba(255,255,255,0.5)" />
              {/* Top penalty area */}
              <rect x="20" y="3" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              <rect x="32" y="3" width="36" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              {/* Bottom penalty area */}
              <rect x="20" y="105" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              <rect x="32" y="119" width="36" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              {/* Penalty arcs */}
              <path d="M 35 25 Q 50 32 65 25" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
              <path d="M 35 105 Q 50 98 65 105" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
            </svg>

            {/* Player tokens on pitch */}
            {formationPositions.map((pos, slotIdx) => {
              const playerIdx = pitchSlots[slotIdx];
              const player = playerIdx !== null ? players[playerIdx] : null;
              const isSelected = selectedSlot === slotIdx;

              return (
                <div
                  key={slotIdx}
                  className="absolute flex flex-col items-center cursor-pointer"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y * 100 / 130}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => {
                    if (player) {
                      // Double-click to remove
                      removeFromPitch(slotIdx);
                    } else {
                      setSelectedSlot(isSelected ? null : slotIdx);
                    }
                  }}
                >
                  {player ? (
                    <>
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm sm:text-base overflow-hidden"
                        style={{ backgroundColor: team?.crest_url ? '#d4a017' : '#3B82F6' }}>
                        {player.photo_url ? (
                          <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          player.dorsal || '?'
                        )}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-white font-bold mt-0.5 text-center leading-tight drop-shadow-md max-w-16 truncate">
                        {player.player_name.split(' ').pop()?.toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-dashed flex items-center justify-center text-white/60 text-lg transition-all ${
                      isSelected ? 'border-yellow-400 bg-yellow-400/30 scale-110' : 'border-white/40 bg-white/10'
                    }`}>
                      +
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hint text */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <p className="text-[9px] text-white/50">Toca una posición vacía y luego un jugador para asignarlo</p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 sm:w-80 lg:w-96 border-l bg-card flex flex-col shrink-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b shrink-0">
            {([
              { key: 'match' as EditorTab, icon: '⚽', label: 'Partido' },
              { key: 'players' as EditorTab, icon: '👥', label: 'Jugadores' },
              { key: 'list' as EditorTab, icon: '📋', label: 'Lista' },
              { key: 'export' as EditorTab, icon: '📤', label: 'Exportar' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
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
                  <label className="text-xs font-medium text-muted-foreground">Equipo</label>
                  <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            {t.crest_url && <img src={t.crest_url} alt="" className="h-4 w-4 object-contain" />}
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rival</label>
                  <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Rival" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                  <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hora</label>
                  <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Notas</label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="h-8 text-xs" />
                </div>
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-4">
                {/* Suplentes */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Suplentes ({substitutePlayers.length})
                  </h3>
                  <div className="space-y-1">
                    {substitutePlayers.map(p => (
                      <div key={p._idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/80 text-white cursor-pointer hover:bg-blue-500/80 transition-colors"
                        onClick={() => toggleSubstitute(p._idx)}>
                        <span className="text-xs font-bold w-6">{p.dorsal}</span>
                        <span className="text-xs font-bold uppercase flex-1 truncate">{p.player_name.split(' ').pop()}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFromList(p._idx); }} className="text-white/60 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {substitutePlayers.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-2">Haz clic en un desconvocado para marcarlo como suplente</p>
                    )}
                  </div>
                </div>

                {/* Desconvocados */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Desconvocados ({desconvocados.length})
                  </h3>
                  <div className="space-y-1">
                    {desconvocados.map(p => (
                      <div key={p._idx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          selectedSlot !== null
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/30'
                            : 'bg-muted/60 hover:bg-muted'
                        }`}
                        onClick={() => {
                          if (selectedSlot !== null) {
                            assignToSlot(p._idx);
                          } else {
                            toggleSubstitute(p._idx);
                          }
                        }}>
                        <span className="text-xs font-bold w-6 text-muted-foreground">{p.dorsal}</span>
                        <span className="text-xs font-bold uppercase flex-1 truncate">{p.player_name.split(' ').pop()}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFromList(p._idx); }} className="text-muted-foreground/40 hover:text-muted-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-4">
                {starters.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Titulares ({starters.length})</h3>
                    {starters.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs border-b border-border/30">
                        <span className="font-bold w-6">{p.dorsal}</span>
                        <span className="flex-1 truncate">{p.player_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {substitutePlayers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">Suplentes ({substitutePlayers.length})</h3>
                    {substitutePlayers.map(p => (
                      <div key={p._idx} className="flex items-center gap-2 py-1.5 text-xs border-b border-border/30">
                        <span className="font-bold w-6">{p.dorsal}</span>
                        <span className="flex-1 truncate">{p.player_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {desconvocados.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Desconvocados ({desconvocados.length})</h3>
                    {desconvocados.map(p => (
                      <div key={p._idx} className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground border-b border-border/30">
                        <span className="font-bold w-6">{p.dorsal}</span>
                        <span className="flex-1 truncate">{p.player_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <div ref={previewRef} className="rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
                  <div className="text-center mb-4">
                    {team?.crest_url && <img src={team.crest_url} alt="" className="h-10 w-10 mx-auto mb-1 object-contain" />}
                    <h2 className="text-sm font-bold tracking-wide uppercase">{team?.name || 'Equipo'}</h2>
                    <p className="text-white/50 text-[10px]">CONVOCATORIA</p>
                    {opponent && <p className="text-white/70 text-[10px]">vs {opponent}</p>}
                    <div className="flex items-center justify-center gap-3 text-white/40 text-[10px] mt-1">
                      {matchDate && <span>{matchDate}</span>}
                      {matchTime && <span>{matchTime}h</span>}
                    </div>
                  </div>

                  {starters.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 border-b border-white/10 pb-1">Titulares ({starters.length})</h3>
                      <div className="grid grid-cols-2 gap-1">
                        {starters.map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded p-1.5">
                            <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center text-[9px] font-bold shrink-0">{p.dorsal || '?'}</div>
                            <span className="text-[9px] font-semibold truncate">{p.player_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {substitutePlayers.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 border-b border-white/10 pb-1">Suplentes ({substitutePlayers.length})</h3>
                      <div className="grid grid-cols-2 gap-1">
                        {substitutePlayers.map(p => (
                          <div key={p._idx} className="flex items-center gap-1.5 bg-white/5 rounded p-1.5">
                            <div className="h-6 w-6 rounded-full bg-blue-500/30 flex items-center justify-center text-[9px] font-bold shrink-0">{p.dorsal || '?'}</div>
                            <span className="text-[9px] font-semibold truncate">{p.player_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button className="w-full" size="sm" onClick={downloadImage}>
                  <Download className="h-4 w-4 mr-1" />Descargar imagen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeams, Team, Player } from '@/hooks/useTeams';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Users, UserCheck, UserMinus, Download, Calendar, Clock, FileText, Eye } from 'lucide-react';
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

export default function Callups() {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();
  const { textClass, btnClass } = useTheme();
  const navigate = useNavigate();

  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'editor' | 'preview'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Editor state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<CallupPlayer[]>([]);

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
    setView('editor');
  };

  const togglePlayerStatus = (idx: number) => {
    setPlayers(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const next: CallupPlayer['status'] =
        p.status === 'not_called' ? 'starter' :
        p.status === 'starter' ? 'substitute' :
        'not_called';
      return { ...p, status: next };
    }));
  };

  const saveCallup = async () => {
    if (!user) return;
    const calledPlayers = players.filter(p => p.status !== 'not_called');
    if (!selectedTeamId) { toast.error('Selecciona un equipo'); return; }

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

  const starters = players.filter(p => p.status === 'starter');
  const substitutes = players.filter(p => p.status === 'substitute');
  const notCalled = players.filter(p => p.status === 'not_called');

  const teamForPreview = (callup?: Callup) => {
    const tId = callup?.team_id || selectedTeamId;
    return teams.find(t => t.id === tId);
  };

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

  const statusBadge = (status: CallupPlayer['status']) => {
    if (status === 'starter') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">TIT</span>;
    if (status === 'substitute') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning">SUP</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">NO</span>;
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

  // ── PREVIEW VIEW ──
  if (view === 'preview') {
    const team = teamForPreview();
    return (
      <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView('editor')} className={btnClass}>
            <ArrowLeft className="h-4 w-4 mr-1" />Volver al editor
          </Button>
          <Button size="sm" onClick={downloadImage}><Download className="h-4 w-4 mr-1" />Descargar imagen</Button>
        </div>

        <div ref={previewRef} className="rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            {team?.crest_url && <img src={team.crest_url} alt="" className="h-16 w-16 mx-auto mb-2 object-contain" />}
            <h2 className="text-2xl font-bold tracking-wide uppercase">{team?.name || 'Equipo'}</h2>
            <p className="text-white/60 text-sm mt-1">CONVOCATORIA</p>
            {opponent && <p className="text-white/80 text-sm mt-1">vs {opponent}</p>}
            <div className="flex items-center justify-center gap-4 text-white/50 text-xs mt-2">
              {matchDate && <span>{matchDate}</span>}
              {matchTime && <span>{matchTime}h</span>}
            </div>
          </div>

          {/* Starters */}
          {starters.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 border-b border-white/10 pb-1">Titulares ({starters.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {starters.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold">{p.dorsal || '?'}</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{p.player_name}</p>
                      {p.dorsal && <p className="text-[10px] text-white/50">#{p.dorsal}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Substitutes */}
          {substitutes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-warning mb-3 border-b border-white/10 pb-1">Suplentes ({substitutes.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {substitutes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-warning/30 flex items-center justify-center text-xs font-bold">{p.dorsal || '?'}</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{p.player_name}</p>
                      {p.dorsal && <p className="text-[10px] text-white/50">#{p.dorsal}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40">{notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── EDITOR VIEW ──
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView('list')} className={btnClass}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className={`font-display text-lg sm:text-xl ${textClass}`}>{editId ? 'Editar' : 'Nueva'} Convocatoria</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView('preview')} disabled={starters.length === 0 && substitutes.length === 0}>
            <Eye className="h-4 w-4 mr-1" />Vista previa
          </Button>
          <Button size="sm" onClick={saveCallup}><Save className="h-4 w-4 mr-1" />Guardar</Button>
        </div>
      </div>

      {/* Match info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Equipo</label>
              <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
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
              <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Nombre del rival" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha</label>
              <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hora</label>
              <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales..." />
          </div>
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <UserCheck className="h-3.5 w-3.5" />{starters.length} Titulares
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
          <Users className="h-3.5 w-3.5" />{substitutes.length} Suplentes
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
          <UserMinus className="h-3.5 w-3.5" />{notCalled.length} No convocados
        </div>
      </div>

      {/* Players */}
      {players.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground text-sm">Selecciona un equipo para cargar los jugadores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {players.map((p, idx) => (
            <div
              key={idx}
              onClick={() => togglePlayerStatus(idx)}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                p.status === 'starter' ? 'bg-primary/5 border-primary/30' :
                p.status === 'substitute' ? 'bg-warning/5 border-warning/30' :
                'bg-card border-border opacity-60'
              }`}
            >
              {p.photo_url ? (
                <img src={p.photo_url} alt="" className="h-9 w-9 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{p.dorsal || '?'}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.player_name}</p>
                {p.dorsal && <p className="text-xs text-muted-foreground">#{p.dorsal}</p>}
              </div>
              {statusBadge(p.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

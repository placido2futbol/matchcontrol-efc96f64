import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';
import type { Callup, CallupPlayer } from '@/components/callups/types';

export function useCallupManager() {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();

  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [callupTime, setCallupTime] = useState('');
  const [callupLocation, setCallupLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<CallupPlayer[]>([]);
  const [autofillLoading, setAutofillLoading] = useState(false);

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
        callup_time: (c as any).callup_time ?? null,
        callup_location: (c as any).callup_location ?? '',
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
    return new Array(11).fill(null);
  };

  const subtractOneHour = (hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    const total = (h * 60 + m - 60 + 24 * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const autofillFromFCF = async () => {
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) { toast.error('Selecciona primero un equipo'); return; }
    if (!team.fcf_url) { toast.error('Este equipo no tiene URL de FCF configurada en Equipos'); return; }
    setAutofillLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fcf-next-match', {
        body: { teamPageUrl: team.fcf_url },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'No se pudo obtener el próximo partido');
      const m = data.data;
      if (m.opponent) setOpponent(m.opponent);
      if (m.matchDate) setMatchDate(m.matchDate);
      if (m.matchTime) {
        setMatchTime(m.matchTime);
        setCallupTime(subtractOneHour(m.matchTime));
      }
      if (m.field) setCallupLocation(m.field);
      const refereeNote = m.referee ? `Àrbitre: ${m.referee}` : '';
      if (refereeNote) {
        setNotes(prev => prev ? `${prev}${prev.includes(refereeNote) ? '' : ' | ' + refereeNote}` : refereeNote);
      }
      toast.success(`Partido cargado: vs ${m.opponent}${m.homeAway === 'home' ? ' (casa)' : ' (fuera)'}`);
    } catch (e: any) {
      toast.error(e.message || 'Error obteniendo el próximo partido');
    } finally {
      setAutofillLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setSelectedTeamId('');
    setMatchDate('');
    setMatchTime('');
    setCallupTime('');
    setCallupLocation('');
    setOpponent('');
    setNotes('');
    setPlayers([]);
  };

  const loadCallup = (c: Callup) => {
    setEditId(c.id);
    setSelectedTeamId(c.team_id || '');
    setMatchDate(c.match_date || '');
    setMatchTime(c.match_time || '');
    setCallupTime(c.callup_time || '');
    setCallupLocation(c.callup_location || '');
    setOpponent(c.opponent);
    setNotes(c.notes);
    setPlayers(c.players);
    return c.players;
  };

  const saveCallup = async (pitchSlots: (number | null)[]) => {
    if (!user) return;
    if (!selectedTeamId) { toast.error('Selecciona un equipo'); return; }

    const updatedPlayers = players.map((p, i) => {
      if (pitchSlots.includes(i)) return { ...p, status: 'starter' as const };
      return p;
    });
    const calledPlayers = updatedPlayers.filter(p => p.status !== 'not_called');

    if (editId) {
      await supabase.from('callups').update({
        team_id: selectedTeamId,
        match_date: matchDate || null,
        match_time: matchTime || null,
        callup_time: callupTime || null,
        callup_location: callupLocation,
        opponent,
        notes,
      } as any).eq('id', editId);
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
        callup_time: callupTime || null,
        callup_location: callupLocation,
        opponent,
        notes,
      } as any).select().single();
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

  const deleteCallup = async (id: string) => {
    await supabase.from('callup_players').delete().eq('callup_id', id);
    await supabase.from('callups').delete().eq('id', id);
    toast.success('Convocatoria eliminada');
    await fetchCallups();
  };

  const importFromExcel = async (file: File) => {
    try {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) { toast.error('El archivo está vacío'); return; }

      const header = (rows[0] as string[]).map(h => String(h ?? '').toLowerCase().trim());
      const nameCol = header.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('jugador'));
      const dorsalCol = header.findIndex(h => h.includes('dorsal') || h.includes('número') || h.includes('numero') || h.includes('num'));

      if (nameCol < 0) { toast.error('No se encontró columna de nombre'); return; }

      const existing = new Set(players.map(p => p.player_name.toLowerCase()));
      let added = 0;
      const newPlayers = [...players];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        const name = String(row[nameCol] ?? '').trim();
        if (!name || existing.has(name.toLowerCase())) continue;
        existing.add(name.toLowerCase());
        newPlayers.push({
          player_name: name,
          dorsal: dorsalCol >= 0 ? String(row[dorsalCol] ?? '') : '',
          photo_url: '',
          status: 'not_called',
          position_order: newPlayers.length,
        });
        added++;
      }

      setPlayers(newPlayers);
      toast.success(`${added} jugadores importados desde Excel`);
    } catch {
      toast.error('Error leyendo el archivo Excel');
    }
  };

  return {
    callups, loading, teamsLoading, teams, editId, setEditId,
    selectedTeamId, setSelectedTeamId, selectedTeam,
    matchDate, setMatchDate, matchTime, setMatchTime,
    callupTime, setCallupTime, callupLocation, setCallupLocation,
    opponent, setOpponent, notes, setNotes,
    players, setPlayers,
    autofillLoading, autofillFromFCF,
    resetForm, loadCallup, loadTeamPlayers,
    saveCallup, deleteCallup, fetchCallups,
    importFromExcel,
  };
}

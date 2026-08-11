import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';
import type { Callup, CallupPlayer } from '@/components/callups/types';
import { CURRENT_SEASON } from '@/config/season';

export function useCallupManager() {
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();

  const [callups, setCallups] = useState<Callup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

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
      .eq('season', CURRENT_SEASON)
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
        match_id: (c as any).match_id ?? null,
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
        body: { teamPageUrl: team.fcf_url, season: CURRENT_SEASON },
      });
      if (error) throw error;
      if (!data?.success) {
        if (data?.pending) { toast.info(data.error); return; }
        throw new Error(data?.error || 'No se pudo obtener el próximo partido');
      }
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
    setMatchId(null);
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
    setMatchId((c as any).match_id ?? null);
    setSelectedTeamId(c.team_id || '');
    setMatchDate(c.match_date || '');
    setMatchTime(c.match_time || '');
    setCallupTime(c.callup_time || '');
    setCallupLocation(c.callup_location || '');
    setOpponent(c.opponent);
    setNotes(c.notes);

    // Merge saved called/substitute players with the full team roster so
    // desconvocados (not_called) also appear and can be promoted later.
    const team = teams.find(t => t.id === c.team_id);
    const calledByName = new Map(c.players.map(p => [p.player_name.toLowerCase(), p]));
    const merged: CallupPlayer[] = [...c.players];
    if (team) {
      team.players.forEach(tp => {
        if (!calledByName.has(tp.name.toLowerCase())) {
          merged.push({
            player_name: tp.name,
            dorsal: tp.dorsal,
            photo_url: tp.photo_url,
            status: 'not_called',
            position_order: merged.length,
          });
        }
      });
    }
    setPlayers(merged);
    return merged;
  };

  // Sync a match record (and its match_players) with the current callup.
  // The user's team is set as the home team by default.
  const syncMatchFromCallup = async (
    starters: CallupPlayer[],
    subs: CallupPlayer[],
    existingMatchId: string | null
  ): Promise<string | null> => {
    if (!user) return null;
    const team = teams.find(t => t.id === selectedTeamId);
    const homeName = team?.name || '';
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const awayTeam = opponent
      ? teams.find(t => t.id !== selectedTeamId && (norm(t.name) === norm(opponent) || norm(t.name).includes(norm(opponent)) || norm(opponent).includes(norm(t.name))))
      : null;
    const matchPayload = {
      user_id: user.id,
      home_team_id: selectedTeamId || null,
      away_team_id: awayTeam?.id || null,
      home_team_name: homeName,
      away_team_name: opponent || '',
      match_date: matchDate || null,
      match_time: matchTime || null,
      season: CURRENT_SEASON,
    };

    let mId = existingMatchId;
    if (mId) {
      // Update metadata but DO NOT overwrite status (keep in_progress/finished if already set)
      const { error } = await supabase.from('matches').update(matchPayload).eq('id', mId);
      if (error) { mId = null; }
    }
    if (!mId) {
      const { data, error } = await supabase
        .from('matches')
        .insert({ ...matchPayload, status: 'scheduled' })
        .select().single();
      if (error || !data) { toast.error('Error creando partido vinculado'); return null; }
      mId = data.id;
    }

    // Replace match_players with starters + subs from callup (home side only)
    await supabase.from('match_players').delete().eq('match_id', mId).eq('team_side', 'home');

    const rows = [
      ...starters.slice(0, 11).map(p => ({
        match_id: mId,
        team_side: 'home',
        player_name: p.player_name,
        dorsal: p.dorsal || '',
        is_starter: true,
        goals: 0,
        yellow_cards: 0,
        red_card: false,
        minutes_played: 0,
      })),
      ...subs.slice(0, 9).map(p => ({
        match_id: mId,
        team_side: 'home',
        player_name: p.player_name,
        dorsal: p.dorsal || '',
        is_starter: false,
        goals: 0,
        yellow_cards: 0,
        red_card: false,
        minutes_played: 0,
      })),
    ];
    if (rows.length > 0) {
      await supabase.from('match_players').insert(rows);
    }
    return mId;
  };

  const saveCallup = async (pitchSlots: (number | null)[]) => {
    if (!user) return;
    if (!selectedTeamId) { toast.error('Selecciona un equipo'); return; }

    // Build starters in pitch order, then substitutes, but persist the full roster
    // so not-called players are still available when reopening the callup.
    const starters: CallupPlayer[] = [];
    const starterIndices = new Set<number>();
    pitchSlots.forEach(idx => {
      if (idx !== null && players[idx]) {
        starterIndices.add(idx);
        starters.push({ ...players[idx], status: 'starter' });
      }
    });
    const subs = players.filter((p, i) => p.status === 'substitute' && !starterIndices.has(i));
    const notCalled = players.filter((p, i) => !starterIndices.has(i) && p.status !== 'substitute');
    const playersToPersist = [...starters, ...subs, ...notCalled.map(p => ({ ...p, status: 'not_called' as const }))];

    let savedCallupId = editId;
    let savedMatchId = matchId;

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
      if (playersToPersist.length > 0) {
        await supabase.from('callup_players').insert(
          playersToPersist.map((p, i) => ({
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
        season: CURRENT_SEASON,
        match_date: matchDate || null,
        match_time: matchTime || null,
        callup_time: callupTime || null,
        callup_location: callupLocation,
        opponent,
        notes,
      } as any).select().single();
      if (error || !data) { toast.error('Error guardando convocatoria'); return; }
      savedCallupId = data.id;
      if (playersToPersist.length > 0) {
        await supabase.from('callup_players').insert(
          playersToPersist.map((p, i) => ({
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

    // Create / update linked match with starters + subs prefilled
    const newMatchId = await syncMatchFromCallup(starters, subs, savedMatchId);
    if (newMatchId && newMatchId !== savedMatchId && savedCallupId) {
      await supabase.from('callups').update({ match_id: newMatchId } as any).eq('id', savedCallupId);
      setMatchId(newMatchId);
    } else if (newMatchId) {
      setMatchId(newMatchId);
    }

    toast.success('Convocatoria y partido guardados');
    await fetchCallups();
  };

  const deleteCallup = async (id: string) => {
    const { data: c } = await supabase.from('callups').select('match_id').eq('id', id).maybeSingle();
    const linkedMatchId = (c as any)?.match_id as string | undefined;
    await supabase.from('callup_players').delete().eq('callup_id', id);
    await supabase.from('callups').delete().eq('id', id);
    if (linkedMatchId) {
      await supabase.from('match_events').delete().eq('match_id', linkedMatchId);
      await supabase.from('match_players').delete().eq('match_id', linkedMatchId);
      await supabase.from('matches').delete().eq('id', linkedMatchId);
    }
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

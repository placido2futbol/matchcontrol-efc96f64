import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Printer, Pencil, Save, Plus, Trash2 } from 'lucide-react';
import { calcMinutesFromDbEvents } from '@/lib/calcMinutesFromDbEvents';
import { toast } from 'sonner';

interface MatchDetail {
  id: string;
  match_date: string | null;
  match_time: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  halftime_result: string | null;
  total_seconds: number;
  status: string;
}

interface MatchEventRow {
  id: string;
  minute: number;
  event_type: string;
  team_side: string;
  player_name: string;
  details: string;
}

interface MatchPlayerRow {
  id: string;
  player_name: string;
  dorsal: string;
  team_side: string;
  is_starter: boolean;
  goals: number;
  yellow_cards: number;
  red_card: boolean;
  minutes_played: number;
}

const typeLabels: Record<string, string> = {
  goal: '⚽ Gol',
  yellow: '🟨 Amarilla',
  second_yellow: '🟨🟨 2ª Amarilla',
  red: '🟥 Roja',
  substitution: '🔄 Cambio',
  sub_in: '🔄 Entra',
  sub_out: '🔄 Sale',
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEventRow[]>([]);
  const [players, setPlayers] = useState<MatchPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [editedMinutes, setEditedMinutes] = useState<Record<string, number>>({});
  const [editingEvents, setEditingEvents] = useState(false);
  const [editedEvents, setEditedEvents] = useState<MatchEventRow[]>([]);
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [savingEvents, setSavingEvents] = useState(false);

  const reload = async () => {
    if (!user || !id) return;
    const { data: m } = await supabase.from('matches').select('*').eq('id', id).single();
    const { data: ev } = await supabase.from('match_events').select('*').eq('match_id', id).order('minute');
    const { data: pl } = await supabase.from('match_players').select('*').eq('match_id', id);
    setMatch(m as MatchDetail | null);
    setEvents((ev || []) as MatchEventRow[]);
    setPlayers((pl || []) as MatchPlayerRow[]);
  };

  useEffect(() => {
    if (!user || !id) return;
    reload().then(() => setLoading(false));
  }, [user, id]);

  const handlePrint = () => window.print();

  // --- Minutes editing ---
  const startEditMinutes = () => {
    const map: Record<string, number> = {};
    players.forEach(p => {
      map[p.id] = p.minutes_played > 0 ? p.minutes_played : getMinutes(p);
    });
    setEditedMinutes(map);
    setEditingMinutes(true);
  };

  const saveMinutes = async () => {
    setSavingMinutes(true);
    try {
      for (const [playerId, mins] of Object.entries(editedMinutes)) {
        await supabase.from('match_players').update({ minutes_played: mins }).eq('id', playerId);
      }
      toast.success('Minutos actualizados');
      setEditingMinutes(false);
      await reload();
    } catch {
      toast.error('Error al guardar');
    }
    setSavingMinutes(false);
  };

  // --- Events editing ---
  const startEditEvents = () => {
    setEditedEvents(events.map(e => ({ ...e })));
    setEditingEvents(true);
  };

  const addSubstitution = (teamSide: string) => {
    const newEv: MatchEventRow = {
      id: `new-${Date.now()}`,
      minute: 0,
      event_type: 'substitution',
      team_side: teamSide,
      player_name: '',
      details: '',
    };
    setEditedEvents(prev => [...prev, newEv]);
  };

  const updateEditedEvent = (idx: number, field: keyof MatchEventRow, value: string | number) => {
    setEditedEvents(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEditedEvent = (idx: number) => {
    setEditedEvents(prev => prev.filter((_, i) => i !== idx));
  };

  const saveEvents = async () => {
    if (!id) return;
    setSavingEvents(true);
    try {
      // Delete removed events
      const keptIds = new Set(editedEvents.filter(e => !e.id.startsWith('new-')).map(e => e.id));
      const toDelete = events.filter(e => !keptIds.has(e.id));
      for (const ev of toDelete) {
        await supabase.from('match_events').delete().eq('id', ev.id);
      }
      // Update existing events
      for (const ev of editedEvents) {
        if (ev.id.startsWith('new-')) {
          await supabase.from('match_events').insert({
            match_id: id,
            minute: ev.minute,
            event_type: ev.event_type,
            team_side: ev.team_side,
            player_name: ev.player_name,
            details: ev.details,
          });
        } else {
          await supabase.from('match_events').update({
            minute: ev.minute,
            event_type: ev.event_type,
            player_name: ev.player_name,
            details: ev.details,
          }).eq('id', ev.id);
        }
      }
      toast.success('Incidencias actualizadas');
      setEditingEvents(false);
      await reload();
    } catch {
      toast.error('Error al guardar');
    }
    setSavingEvents(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!match) return <div className="p-8 text-center text-muted-foreground">Partido no encontrado</div>;

  const homePlayers = players.filter(p => p.team_side === 'home');
  const awayPlayersRaw = players.filter(p => p.team_side === 'away');
  const homeEvents = events.filter(e => e.team_side === 'home');
  const awayEvents = events.filter(e => e.team_side === 'away');

  const awayPlayers: MatchPlayerRow[] = awayPlayersRaw.length > 0
    ? awayPlayersRaw
    : (() => {
        const playerMap = new Map<string, MatchPlayerRow>();
        awayEvents.forEach(ev => {
          const name = ev.player_name?.trim();
          if (!name) return;
          if (!playerMap.has(name)) {
            playerMap.set(name, {
              id: `synth-${name}`,
              player_name: name,
              dorsal: '',
              team_side: 'away',
              is_starter: false,
              goals: 0,
              yellow_cards: 0,
              red_card: false,
              minutes_played: 0,
            });
          }
          const p = playerMap.get(name)!;
          if (ev.event_type === 'goal') p.goals += 1;
          if (ev.event_type === 'yellow') p.yellow_cards += 1;
          if (ev.event_type === 'second_yellow') { p.yellow_cards += 1; p.red_card = true; }
          if (ev.event_type === 'red') p.red_card = true;
        });
        return Array.from(playerMap.values());
      })();

  const getMinutes = (player: MatchPlayerRow) => {
    if (player.minutes_played > 0) return player.minutes_played;
    const sideEvents = player.team_side === 'home' ? homeEvents : awayEvents;
    return calcMinutesFromDbEvents(
      player.player_name,
      player.is_starter,
      sideEvents,
      match.total_seconds
    );
  };

  const renderPlayerTable = (teamPlayers: MatchPlayerRow[], label: string) => (
    <div>
      <h4 className="font-bold text-sm mb-1 text-foreground">{label}</h4>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-[10px] sm:text-xs border border-border" style={{ minWidth: '360px' }}>
          <thead>
            <tr className="bg-muted">
              <th className="p-0.5 sm:p-1 text-left text-muted-foreground">Nº</th>
              <th className="p-0.5 sm:p-1 text-left text-muted-foreground">Jugador</th>
              <th className="p-0.5 sm:p-1 text-center text-muted-foreground">Tit</th>
              <th className="p-0.5 sm:p-1 text-center text-muted-foreground">Gol</th>
              <th className="p-0.5 sm:p-1 text-center text-muted-foreground">TA</th>
              <th className="p-0.5 sm:p-1 text-center text-muted-foreground">TR</th>
              <th className="p-0.5 sm:p-1 text-center text-muted-foreground">Min</th>
            </tr>
          </thead>
          <tbody>
            {teamPlayers.map(p => (
              <tr key={p.id} className="border-b border-border">
                <td className="p-0.5 sm:p-1 text-muted-foreground">{p.dorsal || '-'}</td>
                <td className="p-0.5 sm:p-1 text-foreground">{p.player_name}</td>
                <td className="p-0.5 sm:p-1 text-center">{p.is_starter ? '✓' : ''}</td>
                <td className="p-0.5 sm:p-1 text-center font-bold">{p.goals || ''}</td>
                <td className="p-0.5 sm:p-1 text-center">{p.yellow_cards || ''}</td>
                <td className="p-0.5 sm:p-1 text-center">{p.red_card ? '🟥' : ''}</td>
                <td className="p-0.5 sm:p-1 text-center text-muted-foreground">
                  {editingMinutes ? (
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={editedMinutes[p.id] ?? 0}
                      onChange={e => setEditedMinutes(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                      className="h-6 w-12 text-xs text-center p-0"
                    />
                  ) : (
                    `${getMinutes(p)}'`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const subEvents = editingEvents
    ? editedEvents.filter(e => e.event_type === 'substitution' || e.event_type === 'sub_in' || e.event_type === 'sub_out')
    : events.filter(e => e.event_type === 'substitution' || e.event_type === 'sub_in' || e.event_type === 'sub_out');

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4 space-y-4 print:p-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="font-display text-lg sm:text-xl text-foreground">
            <FileText className="inline h-5 w-5 mr-1" /> Detalle del Partido
          </h1>
        </div>
        <Button variant="outline" size="sm" className="sm:ml-auto w-fit" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
        </Button>
      </div>

      <div className="hidden print:block text-center mb-4">
        <h1 className="font-bold text-lg">MatchControl - Detalle del Partido</h1>
      </div>

      {/* Score */}
      <Card>
        <CardContent className="py-4 sm:py-6 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {match.match_date || 'Sin fecha'} {match.match_time || ''}
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <span className="font-bold text-sm sm:text-base text-foreground truncate max-w-[100px] sm:max-w-none">{match.home_team_name}</span>
            <span className="font-display text-2xl sm:text-3xl text-foreground whitespace-nowrap">
              {match.home_score} - {match.away_score}
            </span>
            <span className="font-bold text-sm sm:text-base text-foreground truncate max-w-[100px] sm:max-w-none">{match.away_team_name}</span>
          </div>
          {match.halftime_result && (
            <div className="text-xs text-muted-foreground mt-1">Descanso: {match.halftime_result}</div>
          )}
        </CardContent>
      </Card>

      {/* Players with editable minutes */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-display">Jugadores</CardTitle>
          <div className="print:hidden">
            {editingMinutes ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingMinutes(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveMinutes} disabled={savingMinutes}>
                  <Save className="h-3 w-3 mr-1" /> Guardar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEditMinutes}>
                <Pencil className="h-3 w-3 mr-1" /> Editar minutos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderPlayerTable(homePlayers, match.home_team_name)}
            {renderPlayerTable(awayPlayers, match.away_team_name)}
          </div>
        </CardContent>
      </Card>

      {/* Substitutions / Changes section */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-display">🔄 Cambios</CardTitle>
          <div className="print:hidden">
            {editingEvents ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingEvents(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveEvents} disabled={savingEvents}>
                  <Save className="h-3 w-3 mr-1" /> Guardar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEditEvents}>
                <Pencil className="h-3 w-3 mr-1" /> Editar cambios
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2">
          {subEvents.length === 0 && !editingEvents && (
            <p className="text-xs text-muted-foreground text-center py-2">No hay cambios registrados</p>
          )}
          {subEvents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs border border-border" style={{ minWidth: '300px' }}>
                <thead>
                  <tr className="bg-muted">
                    <th className="p-1 text-muted-foreground">Min</th>
                    <th className="p-1 text-muted-foreground">Equipo</th>
                    <th className="p-1 text-muted-foreground">Detalle</th>
                    {editingEvents && <th className="p-1 text-muted-foreground"></th>}
                  </tr>
                </thead>
                <tbody>
                  {subEvents.map((ev, idx) => {
                    const globalIdx = editingEvents ? editedEvents.indexOf(ev) : -1;
                    return (
                      <tr key={ev.id} className="border-b border-border">
                        <td className="p-1 text-center">
                          {editingEvents ? (
                            <Input
                              type="number"
                              min={0}
                              max={120}
                              value={ev.minute}
                              onChange={e => updateEditedEvent(globalIdx, 'minute', parseInt(e.target.value) || 0)}
                              className="h-6 w-12 text-xs text-center p-0"
                            />
                          ) : (
                            <span className="text-foreground">{ev.minute}'</span>
                          )}
                        </td>
                        <td className="p-1 text-foreground">
                          {editingEvents ? (
                            <Select value={ev.team_side} onValueChange={v => updateEditedEvent(globalIdx, 'team_side', v)}>
                              <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="home">{match.home_team_name}</SelectItem>
                                <SelectItem value="away">{match.away_team_name}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            ev.team_side === 'home' ? match.home_team_name : match.away_team_name
                          )}
                        </td>
                        <td className="p-1 text-foreground">
                          {editingEvents ? (
                            <Input
                              value={ev.details || ev.player_name}
                              onChange={e => {
                                updateEditedEvent(globalIdx, 'details', e.target.value);
                                updateEditedEvent(globalIdx, 'player_name', e.target.value.split('/')[0]?.replace('Sale ', '').trim() || '');
                              }}
                              placeholder="Sale Jugador1 / Entra Jugador2"
                              className="h-6 text-xs"
                            />
                          ) : (
                            <span>{ev.details || ev.player_name}</span>
                          )}
                        </td>
                        {editingEvents && (
                          <td className="p-1 text-center">
                            <Button size="xs" variant="destructive" onClick={() => removeEditedEvent(globalIdx)} className="h-6 w-6 p-0">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {editingEvents && (
            <div className="flex gap-2 mt-2 print:hidden">
              <Button size="sm" variant="outline" onClick={() => addSubstitution('home')}>
                <Plus className="h-3 w-3 mr-1" /> Cambio {match.home_team_name}
              </Button>
              <Button size="sm" variant="outline" onClick={() => addSubstitution('away')}>
                <Plus className="h-3 w-3 mr-1" /> Cambio {match.away_team_name}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-display">Incidencias</CardTitle>
          </CardHeader>
          <CardContent className="py-2 overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs border border-border" style={{ minWidth: '320px' }}>
              <thead>
                <tr className="bg-muted">
                  <th className="p-0.5 sm:p-1 text-muted-foreground">Min</th>
                  <th className="p-0.5 sm:p-1 text-muted-foreground">Equipo</th>
                  <th className="p-0.5 sm:p-1 text-muted-foreground">Tipo</th>
                  <th className="p-0.5 sm:p-1 text-muted-foreground">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-border">
                    <td className="p-0.5 sm:p-1 text-center text-foreground">{ev.minute}'</td>
                    <td className="p-0.5 sm:p-1 text-foreground">{ev.team_side === 'home' ? match.home_team_name : match.away_team_name}</td>
                    <td className="p-0.5 sm:p-1">{typeLabels[ev.event_type] || ev.event_type}</td>
                    <td className="p-0.5 sm:p-1 text-foreground">{ev.player_name} {ev.details && `(${ev.details})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

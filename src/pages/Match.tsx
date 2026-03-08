import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeams, Team } from '@/hooks/useTeams';
import { useTimer } from '@/hooks/useTimer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Scoreboard from '@/components/match/Scoreboard';
import TeamPanel from '@/components/match/TeamPanel';
import EventLog, { MatchEvent } from '@/components/match/EventLog';
import SantPauStats from '@/components/match/SantPauStats';
import { MatchPlayer } from '@/components/match/PlayerRow';
import { Save, ArrowLeft, Share2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { calcMinutesPlayed } from '@/lib/calcMinutesPlayed';
import { useLiveBroadcast, LiveMatchState } from '@/hooks/useLiveMatch';

function createSlots(count: number, startIndex: number, isStarter: boolean): MatchPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: startIndex + i,
    playerName: '',
    dorsal: '',
    goals: 0,
    yellowCard1: false,
    yellowCard2: false,
    redCard: false,
    isStarter,
    subIn: false,
    subOut: false,
  }));
}

export default function MatchPage() {
  const { user } = useAuth();
  const { teams } = useTeams();
  const timer = useTimer();
  const navigate = useNavigate();

  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [halftimeResult, setHalftimeResult] = useState('');

  const [homePlayers, setHomePlayers] = useState<MatchPlayer[]>([
    ...createSlots(11, 0, true),
    ...createSlots(9, 11, false),
  ]);
  const [awayPlayers, setAwayPlayers] = useState<MatchPlayer[]>([
    ...createSlots(11, 100, true),
    ...createSlots(9, 111, false),
  ]);

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [homePendingSub, setHomePendingSub] = useState<number | null>(null);
  const [awayPendingSub, setAwayPendingSub] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const homeTeam = teams.find(t => t.id === homeTeamId) || null;
  const awayTeam = teams.find(t => t.id === awayTeamId) || null;

  const addEvent = useCallback((ev: MatchEvent) => {
    setEvents(prev => [...prev, ev]);
  }, []);

  const createPlayerHandlers = (
    side: 'home' | 'away',
    players: MatchPlayer[],
    setPlayers: React.Dispatch<React.SetStateAction<MatchPlayer[]>>,
    setScore: React.Dispatch<React.SetStateAction<number>>,
    pendingSub: number | null,
    setPendingSub: React.Dispatch<React.SetStateAction<number | null>>
  ) => ({
    onSelectPlayer: (slotIndex: number, playerName: string) => {
      setPlayers(prev => prev.map(p => p.slotIndex === slotIndex ? { ...p, playerName } : p));
    },
    onDorsalChange: (slotIndex: number, dorsal: string) => {
      setPlayers(prev => prev.map(p => p.slotIndex === slotIndex ? { ...p, dorsal } : p));
    },
    onGoal: (slotIndex: number, delta: number) => {
      setPlayers(prev => prev.map(p => {
        if (p.slotIndex !== slotIndex) return p;
        const newGoals = Math.max(0, p.goals + delta);
        return { ...p, goals: newGoals };
      }));
      setScore(prev => Math.max(0, prev + delta));
      if (delta > 0) {
        const player = players.find(p => p.slotIndex === slotIndex);
        addEvent({
          minute: timer.seconds,
          type: 'goal',
          teamSide: side,
          playerName: player?.playerName || 'Desconocido',
        });
      }
    },
    onYellowCard1: (slotIndex: number, checked: boolean) => {
      setPlayers(prev => prev.map(p => {
        if (p.slotIndex !== slotIndex) return p;
        const updated = { ...p, yellowCard1: checked };
        if (checked && p.yellowCard2) updated.redCard = true;
        if (!checked) updated.redCard = false;
        return updated;
      }));
      if (checked) {
        const player = players.find(p => p.slotIndex === slotIndex);
        addEvent({ minute: timer.seconds, type: 'yellow', teamSide: side, playerName: player?.playerName || '' });
      }
    },
    onYellowCard2: (slotIndex: number, checked: boolean) => {
      setPlayers(prev => prev.map(p => {
        if (p.slotIndex !== slotIndex) return p;
        const updated = { ...p, yellowCard2: checked };
        if (checked && p.yellowCard1) updated.redCard = true;
        if (!checked) updated.redCard = false;
        return updated;
      }));
      if (checked) {
        const player = players.find(p => p.slotIndex === slotIndex);
        addEvent({ minute: timer.seconds, type: 'second_yellow', teamSide: side, playerName: player?.playerName || '' });
      }
    },
    onRedCard: (slotIndex: number, checked: boolean) => {
      setPlayers(prev => prev.map(p => p.slotIndex === slotIndex ? { ...p, redCard: checked } : p));
      if (checked) {
        const player = players.find(p => p.slotIndex === slotIndex);
        addEvent({ minute: timer.seconds, type: 'red', teamSide: side, playerName: player?.playerName || '' });
      }
    },
    onSub: (slotIndex: number, type: 'in' | 'out') => {
      if (type === 'out') {
        setPendingSub(slotIndex);
        return;
      }
      if (type === 'in' && pendingSub !== null) {
        const outPlayer = players.find(p => p.slotIndex === pendingSub);
        const inPlayer = players.find(p => p.slotIndex === slotIndex);
        // Swap players
        setPlayers(prev => {
          const outP = prev.find(p => p.slotIndex === pendingSub)!;
          const inP = prev.find(p => p.slotIndex === slotIndex)!;
          return prev.map(p => {
            if (p.slotIndex === pendingSub) return { ...p, playerName: inP.playerName, goals: inP.goals, yellowCard1: inP.yellowCard1, yellowCard2: inP.yellowCard2, redCard: inP.redCard };
            if (p.slotIndex === slotIndex) return { ...p, playerName: outP.playerName, goals: outP.goals, yellowCard1: outP.yellowCard1, yellowCard2: outP.yellowCard2, redCard: outP.redCard };
            return p;
          });
        });
        addEvent({
          minute: timer.seconds,
          type: 'substitution',
          teamSide: side,
          playerName: inPlayer?.playerName || '',
          details: `Sale ${outPlayer?.playerName || ''} / Entra ${inPlayer?.playerName || ''}`,
        });
        setPendingSub(null);
      }
    },
  });

  const homeHandlers = createPlayerHandlers('home', homePlayers, setHomePlayers, setHomeScore, homePendingSub, setHomePendingSub);
  const awayHandlers = createPlayerHandlers('away', awayPlayers, setAwayPlayers, setAwayScore, awayPendingSub, setAwayPendingSub);

  const homeSelected = homePlayers.filter(p => p.playerName).map(p => p.playerName);
  const awaySelected = awayPlayers.filter(p => p.playerName).map(p => p.playerName);

  const saveMatch = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          user_id: user.id,
          match_date: matchDate || null,
          match_time: matchTime || null,
          home_team_id: homeTeamId || null,
          away_team_id: awayTeamId || null,
          home_team_name: homeTeam?.name || 'Local',
          away_team_name: awayTeam?.name || 'Visitante',
          home_score: homeScore,
          away_score: awayScore,
          halftime_result: halftimeResult,
          status: 'finished',
          total_seconds: timer.seconds,
        })
        .select()
        .single();

      if (error || !match) throw error;

      // Save events
      if (events.length > 0) {
        await supabase.from('match_events').insert(
          events.map(ev => ({
            match_id: match.id,
            minute: Math.floor(ev.minute / 60),
            event_type: ev.type,
            team_side: ev.teamSide,
            player_name: ev.playerName,
            details: ev.details || '',
          }))
        );
      }

      // Save match players with correct minutes calculation
      const homeEvents = events.filter(e => e.teamSide === 'home');
      const awayEvents = events.filter(e => e.teamSide === 'away');

      const allPlayers = [
        ...homePlayers.filter(p => p.playerName).map(p => ({
          match_id: match.id,
          player_name: p.playerName,
          dorsal: p.dorsal || '',
          team_side: 'home' as const,
          is_starter: p.isStarter,
          goals: p.goals,
          yellow_cards: (p.yellowCard1 ? 1 : 0) + (p.yellowCard2 ? 1 : 0),
          red_card: p.redCard,
          minutes_played: calcMinutesPlayed(p.playerName, p.isStarter, homeEvents, timer.seconds),
        })),
        ...awayPlayers.filter(p => p.playerName).map(p => ({
          match_id: match.id,
          player_name: p.playerName,
          dorsal: p.dorsal || '',
          team_side: 'away' as const,
          is_starter: p.isStarter,
          goals: p.goals,
          yellow_cards: (p.yellowCard1 ? 1 : 0) + (p.yellowCard2 ? 1 : 0),
          red_card: p.redCard,
          minutes_played: calcMinutesPlayed(p.playerName, p.isStarter, awayEvents, timer.seconds),
        })),
      ];

      if (allPlayers.length > 0) {
        await supabase.from('match_players').insert(allPlayers);
      }

      toast.success('Partido guardado correctamente');
      navigate('/');
    } catch (err: any) {
      toast.error('Error guardando partido: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl text-foreground">Nuevo Partido</h1>
        <div className="ml-auto">
          <Button onClick={saveMatch} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar Partido'}
          </Button>
        </div>
      </div>

      {/* Match info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Día</label>
          <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hora</label>
          <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Res. Descanso</label>
          <Input value={halftimeResult} onChange={e => setHalftimeResult(e.target.value)} placeholder="0-0" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Res. Final</label>
          <Input value={`${homeScore} - ${awayScore}`} readOnly className="bg-muted" />
        </div>
      </div>

      {/* Team selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-foreground">Equipo Local</label>
          <Select value={homeTeamId} onValueChange={setHomeTeamId}>
            <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-bold text-foreground">Equipo Visitante</label>
          <Select value={awayTeamId} onValueChange={setAwayTeamId}>
            <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scoreboard */}
      <Scoreboard
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        timerDisplay={timer.formatTime(timer.seconds)}
        running={timer.running}
        onToggleTimer={timer.toggle}
        onResetTimer={timer.reset}
      />

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeamPanel
          title={homeTeam?.name || 'Equipo Local'}
          teamSide="home"
          starters={homePlayers.filter(p => p.isStarter)}
          subs={homePlayers.filter(p => !p.isStarter)}
          availablePlayers={homeTeam?.players.map(p => p.name) || []}
          selectedPlayers={homeSelected}
          pendingSubSlot={homePendingSub}
          {...homeHandlers}
        />
        <TeamPanel
          title={awayTeam?.name || 'Equipo Visitante'}
          teamSide="away"
          starters={awayPlayers.filter(p => p.isStarter)}
          subs={awayPlayers.filter(p => !p.isStarter)}
          availablePlayers={awayTeam?.players.map(p => p.name) || []}
          selectedPlayers={awaySelected}
          pendingSubSlot={awayPendingSub}
          {...awayHandlers}
        />
      </div>

      {/* Events */}
      <EventLog events={events} />

      {/* Sant Pau Stats */}
      <SantPauStats
        homeTeamName={homeTeam?.name || ''}
        awayTeamName={awayTeam?.name || ''}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        events={events}
        totalSeconds={timer.seconds}
      />
    </div>
  );
}

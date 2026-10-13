import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import goolSound from '@/assets/gool.wav.asset.json';
import { useTeams, Team } from '@/hooks/useTeams';
import { useClub } from '@/hooks/useClub';
import { useTimer } from '@/hooks/useTimer';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_SEASON } from '@/config/season';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import Scoreboard from '@/components/match/Scoreboard';
import TeamPanel from '@/components/match/TeamPanel';
import LineupAnnouncer from '@/components/match/LineupAnnouncer';
import EventLog, { MatchEvent } from '@/components/match/EventLog';
import SantPauStats from '@/components/match/SantPauStats';
import { MatchPlayer } from '@/components/match/PlayerRow';
import FootballPitch, { PlayerPosition, getDefaultPositions } from '@/components/match/FootballPitch';
import { Save, ArrowLeft, Share2, Check, Flag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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

function uniquePlayersByName(players: { name: string }[]) {
  const seen = new Set<string>();
  return players.filter((p) => {
    const key = p.name.trim().toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeImportedPlayers(players: Array<{ name: string; dorsal: string; isStarter: boolean }>) {
  const seen = new Set<string>();
  const starters: Array<{ name: string; dorsal: string }> = [];
  const subs: Array<{ name: string; dorsal: string }> = [];

  for (const p of players) {
    const name = p.name?.trim();
    if (!name) continue;
    const key = name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const target = p.isStarter ? starters : subs;
    target.push({ name, dorsal: p.dorsal || '' });
  }

  return { starters: starters.slice(0, 11), subs: subs.slice(0, 9) };
}

export default function MatchPage() {
  const { user } = useAuth();
  const { teams } = useTeams();
  const { clubId, club, season: activeSeason, isClubTeam } = useClub();
  const goalAudioRef = useRef<HTMLAudioElement | null>(null);
  const playGoalSound = useCallback(() => {
    try {
      if (!goalAudioRef.current) {
        goalAudioRef.current = new Audio(goolSound.url);
        goalAudioRef.current.preload = 'auto';
      }
      goalAudioRef.current.currentTime = 0;
      void goalAudioRef.current.play().catch(() => { /* autoplay bloqueado */ });
    } catch { /* ignore */ }
  }, []);
  const timer = useTimer();
  const navigate = useNavigate();
  const { matchId } = useParams<{ matchId?: string }>();

  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const { broadcast } = useLiveBroadcast(sessionId);
  const [copied, setCopied] = useState(false);

  const [existingMatchId, setExistingMatchId] = useState<string | null>(matchId || null);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [halftimeResult, setHalftimeResult] = useState('');
  const [loadingMatch, setLoadingMatch] = useState(!!matchId);

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
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);

  const homeTeam = teams.find(t => t.id === homeTeamId) || null;
  const awayTeam = teams.find(t => t.id === awayTeamId) || null;

  // Load existing match for editing
  useEffect(() => {
    if (!matchId || !user) return;
    const load = async () => {
      setLoadingMatch(true);
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) {
        toast.error('Partido no encontrado');
        navigate('/');
        return;
      }

      setExistingMatchId(match.id);
      setHomeTeamId(match.home_team_id || '');
      setAwayTeamId(match.away_team_id || '');
      setMatchDate(match.match_date || '');
      setMatchTime(match.match_time || '');
      setHalftimeResult(match.halftime_result || '');
      setHomeScore(match.home_score);
      setAwayScore(match.away_score);
      timer.setSeconds(match.total_seconds);

      // Load events
      const { data: dbEvents } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });

      if (dbEvents) {
        setEvents(dbEvents.map(e => ({
          minute: e.minute * 60, // stored as minutes, convert to seconds
          type: e.event_type as MatchEvent['type'],
          teamSide: e.team_side as 'home' | 'away',
          playerName: e.player_name || '',
          details: e.details || undefined,
        })));
      }

      // Load players
      const { data: dbPlayers } = await supabase
        .from('match_players')
        .select('*')
        .eq('match_id', matchId);

      if (dbPlayers) {
        const homePl = dbPlayers.filter(p => p.team_side === 'home');
        const awayPl = dbPlayers.filter(p => p.team_side === 'away');

        const mapPlayers = (players: typeof dbPlayers, startStarter: number, startSub: number): MatchPlayer[] => {
          const starters = players.filter(p => p.is_starter);
          const subs = players.filter(p => !p.is_starter);
          const slots: MatchPlayer[] = [];

          for (let i = 0; i < 11; i++) {
            const p = starters[i];
            slots.push({
              slotIndex: startStarter + i,
              playerName: p?.player_name || '',
              dorsal: p?.dorsal || '',
              goals: p?.goals || 0,
              yellowCard1: (p?.yellow_cards || 0) >= 1,
              yellowCard2: (p?.yellow_cards || 0) >= 2,
              redCard: p?.red_card || false,
              isStarter: true,
              subIn: false,
              subOut: false,
            });
          }
          for (let i = 0; i < 9; i++) {
            const p = subs[i];
            slots.push({
              slotIndex: startSub + i,
              playerName: p?.player_name || '',
              dorsal: p?.dorsal || '',
              goals: p?.goals || 0,
              yellowCard1: (p?.yellow_cards || 0) >= 1,
              yellowCard2: (p?.yellow_cards || 0) >= 2,
              redCard: p?.red_card || false,
              isStarter: false,
              subIn: false,
              subOut: false,
            });
          }
          return slots;
        };

        setHomePlayers(mapPlayers(homePl, 0, 11));
        setAwayPlayers(mapPlayers(awayPl, 100, 111));
      }

      setLoadingMatch(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user?.id]);

  // Auto-generate default positions when players change and no positions exist
  useEffect(() => {
    const hasNamedStarters = homePlayers.some(p => p.isStarter && p.playerName) || awayPlayers.some(p => p.isStarter && p.playerName);
    if (hasNamedStarters && playerPositions.length === 0) {
      setPlayerPositions(getDefaultPositions(homePlayers, awayPlayers));
    }
  }, [homePlayers, awayPlayers]);

  // Broadcast live state on every change
  useEffect(() => {
    const state: LiveMatchState = {
      homeTeamName: homeTeam?.name || 'Local',
      awayTeamName: awayTeam?.name || 'Visitante',
      homeScore,
      awayScore,
      timerSeconds: timer.seconds,
      timerRunning: timer.running,
      timerLastUpdate: Date.now(),
      events,
      homePlayers,
      awayPlayers,
      halftimeResult,
      matchDate,
      matchTime,
      homeTeamCrest: homeTeam?.crest_url || undefined,
      awayTeamCrest: awayTeam?.crest_url || undefined,
      homeTeamKitHtml: homeTeam?.kit_html || undefined,
      awayTeamKitHtml: awayTeam?.kit_html || undefined,
      homeTeamKitUrl: homeTeam?.kit_url || undefined,
      awayTeamKitUrl: awayTeam?.kit_url || undefined,
      playerPositions,
    };
    broadcast(state);
  }, [homeScore, awayScore, timer.seconds, timer.running, events, homePlayers, awayPlayers, halftimeResult, matchDate, matchTime, homeTeam, awayTeam, playerPositions]);

  const liveUrl = `${window.location.origin}/live/${sessionId}`;
  const handleCopyLink = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const addEvent = useCallback((ev: MatchEvent) => {
    setEvents(prev => [...prev, ev]);
  }, []);

  const deleteEvent = useCallback((index: number) => {
    setEvents(prev => {
      const ev = prev[index];
      if (!ev) return prev;

      if (ev.type === 'goal') {
        if (ev.teamSide === 'home') setHomeScore(s => Math.max(0, s - 1));
        else setAwayScore(s => Math.max(0, s - 1));
        const setPlayers = ev.teamSide === 'home' ? setHomePlayers : setAwayPlayers;
        setPlayers(players =>
          players.map(p =>
            p.playerName === ev.playerName ? { ...p, goals: Math.max(0, p.goals - 1) } : p
          )
        );
      }

      if (ev.type === 'yellow') {
        const setPlayers = ev.teamSide === 'home' ? setHomePlayers : setAwayPlayers;
        setPlayers(players =>
          players.map(p => {
            if (p.playerName !== ev.playerName) return p;
            return { ...p, yellowCard1: false, redCard: false };
          })
        );
      }

      if (ev.type === 'second_yellow') {
        const setPlayers = ev.teamSide === 'home' ? setHomePlayers : setAwayPlayers;
        setPlayers(players =>
          players.map(p =>
            p.playerName === ev.playerName ? { ...p, yellowCard2: false, redCard: false } : p
          )
        );
      }

      if (ev.type === 'red') {
        const setPlayers = ev.teamSide === 'home' ? setHomePlayers : setAwayPlayers;
        setPlayers(players =>
          players.map(p =>
            p.playerName === ev.playerName ? { ...p, redCard: false } : p
          )
        );
      }

      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const createPlayerHandlers = (
    side: 'home' | 'away',
    players: MatchPlayer[],
    setPlayers: React.Dispatch<React.SetStateAction<MatchPlayer[]>>,
    setScore: React.Dispatch<React.SetStateAction<number>>,
    pendingSub: number | null,
    setPendingSub: React.Dispatch<React.SetStateAction<number | null>>,
    team: Team | null
  ) => ({
    onSelectPlayer: (slotIndex: number, playerName: string) => {
      const photoUrl = team?.players.find(p => p.name === playerName)?.photo_url || '';
      setPlayers(prev => prev.map(p => p.slotIndex === slotIndex ? { ...p, playerName, photoUrl } : p));
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
        const scoringTeam = side === 'home' ? homeTeam : awayTeam;
        if (isClubTeam(scoringTeam?.name)) playGoalSound();
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
        if (!outPlayer || !inPlayer || outPlayer.slotIndex === inPlayer.slotIndex) return;
        if (!outPlayer.isStarter || inPlayer.isStarter) {
          toast.error('Selecciona salir en el jugador del campo y entrar en el suplente.');
          setPendingSub(null);
          return;
        }
        setPlayers(prev => {
          const outP = prev.find(p => p.slotIndex === pendingSub);
          const inP = prev.find(p => p.slotIndex === slotIndex);
          if (!outP || !inP) return prev;
          return prev.map(p => {
            if (p.slotIndex === pendingSub) return { ...p, playerName: inP.playerName, dorsal: inP.dorsal, photoUrl: inP.photoUrl, goals: inP.goals, yellowCard1: inP.yellowCard1, yellowCard2: inP.yellowCard2, redCard: inP.redCard };
            if (p.slotIndex === slotIndex) return { ...p, playerName: outP.playerName, dorsal: outP.dorsal, photoUrl: outP.photoUrl, goals: outP.goals, yellowCard1: outP.yellowCard1, yellowCard2: outP.yellowCard2, redCard: outP.redCard };
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

  const homeHandlers = createPlayerHandlers('home', homePlayers, setHomePlayers, setHomeScore, homePendingSub, setHomePendingSub, homeTeam);
  const awayHandlers = createPlayerHandlers('away', awayPlayers, setAwayPlayers, setAwayScore, awayPendingSub, setAwayPendingSub, awayTeam);

  const homeSelected = homePlayers.filter(p => p.playerName).map(p => p.playerName);
  const awaySelected = awayPlayers.filter(p => p.playerName).map(p => p.playerName);

  const homeAvailablePlayers = useMemo(
    () => uniquePlayersByName(homeTeam?.players || []).map((p) => p.name),
    [homeTeam]
  );
  const awayAvailablePlayers = useMemo(
    () => uniquePlayersByName(awayTeam?.players || []).map((p) => p.name),
    [awayTeam]
  );

  const [importingFcf, setImportingFcf] = useState(false);

  const handleImportFCF = async () => {
    if (!homeTeam?.fcf_url && !awayTeam?.fcf_url) {
      toast.error('Al menos uno de los equipos debe tener URL de la FCF configurada.');
      return;
    }

    setImportingFcf(true);
    try {
      const teamUrl = homeTeam?.fcf_url || awayTeam?.fcf_url;
      const { data, error } = await supabase.functions.invoke('fcf-scrape-match', {
        body: { 
          teamPageUrl: teamUrl,
          clubUrl: club?.fcf_url,
          season: activeSeason,
          homeTeamName: homeTeam?.name,
          awayTeamName: awayTeam?.name 
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Error al obtener el acta');
        return;
      }

      if (data.matchData) {
        let newHomePlayers = [...homePlayers];
        let newAwayPlayers = [...awayPlayers];

        // Map and dedupe players from scraped data (avoid repeats between 11/subs)
        if (data.matchData.homePlayers && data.matchData.homePlayers.length > 0) {
          const { starters, subs } = normalizeImportedPlayers(data.matchData.homePlayers);

          starters.forEach((p, i) => {
            newHomePlayers[i] = {
              ...newHomePlayers[i],
              playerName: p.name,
              dorsal: p.dorsal,
              isStarter: true,
            };
          });

          subs.forEach((p, i) => {
            newHomePlayers[11 + i] = {
              ...newHomePlayers[11 + i],
              playerName: p.name,
              dorsal: p.dorsal,
              isStarter: false,
            };
          });
        }

        if (data.matchData.awayPlayers && data.matchData.awayPlayers.length > 0) {
          const { starters, subs } = normalizeImportedPlayers(data.matchData.awayPlayers);

          starters.forEach((p, i) => {
            newAwayPlayers[i] = {
              ...newAwayPlayers[i],
              playerName: p.name,
              dorsal: p.dorsal,
              isStarter: true,
            };
          });

          subs.forEach((p, i) => {
            newAwayPlayers[11 + i] = {
              ...newAwayPlayers[11 + i],
              playerName: p.name,
              dorsal: p.dorsal,
              isStarter: false,
            };
          });
        }

        // Process goals from acta
        const importedGoals = (data.matchData.goals || []) as Array<{playerName: string; minute: number; type: string; teamSide: 'home' | 'away'}>;
        const importedCards = (data.matchData.cards || []) as Array<{playerName: string; minute: number; cardType: string; teamSide: 'home' | 'away'}>;
        const newEvents: MatchEvent[] = [];
        let newHomeScore = 0;
        let newAwayScore = 0;

        // Apply goals to players and create events
        for (const goal of importedGoals) {
          const players = goal.teamSide === 'home' ? newHomePlayers : newAwayPlayers;
          const normName = goal.playerName.toUpperCase().replace(/[,.']/g, '').trim();
          const playerIdx = players.findIndex(p => {
            const pNorm = p.playerName.toUpperCase().replace(/[,.']/g, '').trim();
            return pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm);
          });

          if (playerIdx >= 0) {
            if (goal.teamSide === 'home') {
              newHomePlayers = newHomePlayers.map((p, i) => i === playerIdx ? { ...p, goals: p.goals + 1 } : p);
            } else {
              newAwayPlayers = newAwayPlayers.map((p, i) => i === playerIdx ? { ...p, goals: p.goals + 1 } : p);
            }
          }

          if (goal.teamSide === 'home') newHomeScore++;
          else newAwayScore++;

          newEvents.push({
            minute: goal.minute * 60,
            type: 'goal',
            teamSide: goal.teamSide,
            playerName: goal.playerName,
            details: goal.type === 'penalty' ? 'Penalti' : undefined,
          });
        }

        // Apply cards to players and create events
        for (const card of importedCards) {
          const players = card.teamSide === 'home' ? newHomePlayers : newAwayPlayers;
          const normName = card.playerName.toUpperCase().replace(/[,.']/g, '').trim();
          const playerIdx = players.findIndex(p => {
            const pNorm = p.playerName.toUpperCase().replace(/[,.']/g, '').trim();
            return pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm);
          });

          if (playerIdx >= 0) {
            if (card.cardType === 'yellow') {
              if (card.teamSide === 'home') {
                newHomePlayers = newHomePlayers.map((p, i) => {
                  if (i !== playerIdx) return p;
                  if (!p.yellowCard1) return { ...p, yellowCard1: true };
                  return { ...p, yellowCard2: true, redCard: true };
                });
              } else {
                newAwayPlayers = newAwayPlayers.map((p, i) => {
                  if (i !== playerIdx) return p;
                  if (!p.yellowCard1) return { ...p, yellowCard1: true };
                  return { ...p, yellowCard2: true, redCard: true };
                });
              }
            } else if (card.cardType === 'red') {
              if (card.teamSide === 'home') {
                newHomePlayers = newHomePlayers.map((p, i) => i === playerIdx ? { ...p, redCard: true } : p);
              } else {
                newAwayPlayers = newAwayPlayers.map((p, i) => i === playerIdx ? { ...p, redCard: true } : p);
              }
            }
          }

          const eventType = card.cardType === 'red' ? 'red' : 'yellow';
          newEvents.push({
            minute: card.minute * 60,
            type: eventType,
            teamSide: card.teamSide,
            playerName: card.playerName,
          });
        }

        // Sort events by minute
        newEvents.sort((a, b) => a.minute - b.minute);

        setHomePlayers(newHomePlayers);
        setAwayPlayers(newAwayPlayers);
        setHomeScore(newHomeScore);
        setAwayScore(newAwayScore);
        setEvents(newEvents);

        // Import date and time from acta
        if (data.matchData.matchDate) {
          setMatchDate(data.matchData.matchDate);
        }
        if (data.matchData.matchTime) {
          setMatchTime(data.matchData.matchTime);
        }

        const totalPlayers = (data.matchData.homePlayers?.length || 0) + (data.matchData.awayPlayers?.length || 0);
        toast.success(`Acta importada: ${totalPlayers} jugadores, ${importedGoals.length} goles, ${importedCards.length} tarjetas`);
      } else {
        toast.error('No se encontró el acta para este partido');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión');
    } finally {
      setImportingFcf(false);
    }
  };

  const saveMatch = async (status: 'in_progress' | 'finished') => {
    if (!user) return;
    setSaving(true);
    try {
      const matchData = {
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
        status,
        total_seconds: timer.seconds,
      };

      let matchIdToUse: string;

      if (existingMatchId) {
        // Update existing match
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', existingMatchId);
        if (error) throw error;
        matchIdToUse = existingMatchId;

        // Delete old events and players to re-insert
        await supabase.from('match_events').delete().eq('match_id', matchIdToUse);
        await supabase.from('match_players').delete().eq('match_id', matchIdToUse);
      } else {
        // Insert new match
        const { data: match, error } = await supabase
          .from('matches')
          .insert({ ...matchData, season: activeSeason, club_id: clubId })
          .select()
          .single();
        if (error || !match) throw error;
        matchIdToUse = match.id;
        setExistingMatchId(match.id);
      }

      // Save events
      if (events.length > 0) {
        await supabase.from('match_events').insert(
          events.map(ev => ({
            match_id: matchIdToUse,
            minute: Math.floor(ev.minute / 60),
            event_type: ev.type,
            team_side: ev.teamSide,
            player_name: ev.playerName,
            details: ev.details || '',
          }))
        );
      }

      // Save match players
      const homeEvents = events.filter(e => e.teamSide === 'home');
      const awayEvents = events.filter(e => e.teamSide === 'away');

      const allPlayers = [
        ...homePlayers.filter(p => p.playerName).map(p => ({
          match_id: matchIdToUse,
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
          match_id: matchIdToUse,
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

      if (status === 'finished') {
        toast.success('Partido finalizado y guardado');
        navigate('/');
      } else {
        toast.success('Partido guardado (puedes seguir editándolo)');
      }
    } catch (err: any) {
      toast.error('Error guardando partido: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingMatch) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Cargando partido...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="font-display text-lg sm:text-xl text-foreground">
            {existingMatchId ? 'Editar Partido' : 'Nuevo Partido'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
            <span className="hidden xs:inline">{copied ? 'Copiado' : 'Compartir'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => saveMatch('in_progress')} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
            <span className="sm:hidden">{saving ? '...' : 'Guardar'}</span>
          </Button>
          <Button size="sm" onClick={() => saveMatch('finished')} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Flag className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Finalizar Partido</span>
            <span className="sm:hidden">Finalizar</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
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
        <div className="space-y-2">
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

      <div className="flex flex-wrap justify-end items-center gap-2 pt-2 pb-4">
        {(() => {
          const clubPlayers = isClubTeam(homeTeam?.name) ? homePlayers : isClubTeam(awayTeam?.name) ? awayPlayers : null;
          return clubPlayers ? <LineupAnnouncer starters={clubPlayers.filter(p => p.isStarter)} subs={clubPlayers.filter(p => !p.isStarter)} /> : null;
        })()}
        <Button 
          variant="outline" 
          onClick={handleImportFCF} 
          disabled={!homeTeamId || !awayTeamId || importingFcf}
          className="w-full sm:w-auto"
        >
          {importingFcf ? <span className="animate-spin mr-2">⏳</span> : <Flag className="h-4 w-4 mr-2" />}
          Importar Acta FCF
        </Button>
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
        <div>
        <TeamPanel
          title={homeTeam?.name || 'Equipo Local'}
          teamSide="home"
          starters={homePlayers.filter(p => p.isStarter)}
          subs={homePlayers.filter(p => !p.isStarter)}
          availablePlayers={homeAvailablePlayers}
          selectedPlayers={homeSelected}
          pendingSubSlot={homePendingSub}
          {...homeHandlers}
        />
        </div>
        <div>
        <TeamPanel
          title={awayTeam?.name || 'Equipo Visitante'}
          teamSide="away"
          starters={awayPlayers.filter(p => p.isStarter)}
          subs={awayPlayers.filter(p => !p.isStarter)}
          availablePlayers={awayAvailablePlayers}
          selectedPlayers={awaySelected}
          pendingSubSlot={awayPendingSub}
          {...awayHandlers}
        />
        </div>
      </div>

      {/* Events */}
      <EventLog events={events} onDeleteEvent={deleteEvent} />

      {/* Sant Pau Stats */}
      <SantPauStats
        homeTeamName={homeTeam?.name || ''}
        awayTeamName={awayTeam?.name || ''}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        events={events}
        totalSeconds={timer.seconds}
      />

      {/* Football Pitch */}
      <FootballPitch
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        homeTeamName={homeTeam?.name || 'Local'}
        awayTeamName={awayTeam?.name || 'Visitante'}
        homeTeamCrest={homeTeam?.crest_url || undefined}
        awayTeamCrest={awayTeam?.crest_url || undefined}
        positions={playerPositions}
        onPositionsChange={setPlayerPositions}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { calcMinutesFromDbEvents } from '@/lib/calcMinutesFromDbEvents';

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

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: m } = await supabase.from('matches').select('*').eq('id', id).single();
      const { data: ev } = await supabase.from('match_events').select('*').eq('match_id', id).order('minute');
      const { data: pl } = await supabase.from('match_players').select('*').eq('match_id', id);
      setMatch(m as MatchDetail | null);
      setEvents((ev || []) as MatchEventRow[]);
      setPlayers((pl || []) as MatchPlayerRow[]);
      setLoading(false);
    })();
  }, [user, id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!match) return <div className="p-8 text-center text-muted-foreground">Partido no encontrado</div>;

  const homePlayers = players.filter(p => p.team_side === 'home');
  const awayPlayers = players.filter(p => p.team_side === 'away');
  const homeEvents = events.filter(e => e.team_side === 'home');
  const awayEvents = events.filter(e => e.team_side === 'away');

  const getMinutes = (player: MatchPlayerRow) => {
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
                <td className="p-0.5 sm:p-1 text-center text-muted-foreground">{getMinutes(p)}'</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 print:p-2">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl text-foreground">
          <FileText className="inline h-5 w-5 mr-1" /> Detalle del Partido
        </h1>
        <Button variant="outline" className="ml-auto" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="font-bold text-lg">MatchControl - Detalle del Partido</h1>
      </div>

      {/* Score */}
      <Card>
        <CardContent className="py-6 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {match.match_date || 'Sin fecha'} {match.match_time || ''}
          </div>
          <div className="flex items-center justify-center gap-4">
            <span className="font-bold text-foreground">{match.home_team_name}</span>
            <span className="font-display text-3xl text-foreground">
              {match.home_score} - {match.away_score}
            </span>
            <span className="font-bold text-foreground">{match.away_team_name}</span>
          </div>
          {match.halftime_result && (
            <div className="text-xs text-muted-foreground mt-1">Descanso: {match.halftime_result}</div>
          )}
        </CardContent>
      </Card>

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderPlayerTable(homePlayers, match.home_team_name)}
        {renderPlayerTable(awayPlayers, match.away_team_name)}
      </div>

      {/* Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-display">Incidencias</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <table className="w-full text-xs border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="p-1 text-muted-foreground">Min</th>
                  <th className="p-1 text-muted-foreground">Equipo</th>
                  <th className="p-1 text-muted-foreground">Tipo</th>
                  <th className="p-1 text-muted-foreground">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-border">
                    <td className="p-1 text-center text-foreground">{ev.minute}'</td>
                    <td className="p-1 text-foreground">{ev.team_side === 'home' ? match.home_team_name : match.away_team_name}</td>
                    <td className="p-1">{typeLabels[ev.event_type] || ev.event_type}</td>
                    <td className="p-1 text-foreground">{ev.player_name} {ev.details && `(${ev.details})`}</td>
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

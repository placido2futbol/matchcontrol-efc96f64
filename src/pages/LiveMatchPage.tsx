import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveSubscription, LiveMatchState } from '@/hooks/useLiveMatch';
import KitDisplay from '@/components/match/KitDisplay';
import EventLog, { MatchEvent } from '@/components/match/EventLog';
import { MatchPlayer } from '@/components/match/PlayerRow';
import LiveEventNotification from '@/components/match/LiveEventNotification';
import FootballPitch, { getDefaultPositions } from '@/components/match/FootballPitch';
import { Wifi, WifiOff } from 'lucide-react';

function LiveTimer({ seconds, running, lastUpdate }: { seconds: number; running: boolean; lastUpdate: number }) {
  const [display, setDisplay] = useState(seconds);

  useEffect(() => {
    if (!running) {
      setDisplay(seconds);
      return;
    }
    // Calculate elapsed since last broadcast
    const elapsed = Math.floor((Date.now() - lastUpdate) / 1000);
    setDisplay(seconds + elapsed);

    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - lastUpdate) / 1000);
      setDisplay(seconds + e);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, running, lastUpdate]);

  const m = Math.floor(display / 60).toString().padStart(2, '0');
  const s = (display % 60).toString().padStart(2, '0');
  return <span>{m}:{s}</span>;
}

function LivePlayerSection({ players, sectionLabel }: { players: MatchPlayer[]; sectionLabel: string }) {
  const active = players.filter(p => p.playerName);
  if (active.length === 0) return null;

  return (
    <div className="mb-2">
      <h5 className="text-xs font-semibold text-muted-foreground mb-1">{sectionLabel}</h5>
      <table className="w-full text-xs border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="p-1 text-left text-muted-foreground">Jugador</th>
            <th className="p-1 text-center text-muted-foreground">Goles</th>
            <th className="p-1 text-center text-muted-foreground">🟨</th>
            <th className="p-1 text-center text-muted-foreground">🟥</th>
          </tr>
        </thead>
        <tbody>
          {active.map(p => (
            <tr key={p.slotIndex} className="border-b border-border">
              <td className="p-1 text-foreground font-medium">{p.playerName}</td>
              <td className="p-1 text-center font-bold text-foreground">{p.goals || ''}</td>
              <td className="p-1 text-center">{(p.yellowCard1 ? 1 : 0) + (p.yellowCard2 ? 1 : 0) || ''}</td>
              <td className="p-1 text-center">{p.redCard ? '🟥' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LivePlayerTable({ players, label }: { players: MatchPlayer[]; label: string }) {
  const starters = players.filter(p => p.isStarter);
  const subs = players.filter(p => !p.isStarter);

  if (!starters.some(p => p.playerName) && !subs.some(p => p.playerName)) return null;

  return (
    <div>
      <h4 className="font-bold text-sm mb-2 text-foreground">{label}</h4>
      <LivePlayerSection players={starters} sectionLabel="Titulares" />
      <LivePlayerSection players={subs} sectionLabel="Suplentes" />
    </div>
  );
}

export default function LiveMatchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [state, setState] = useState<LiveMatchState | null>(null);
  const [connected, setConnected] = useState(false);

  const handleState = useCallback((s: LiveMatchState) => {
    setState(s);
    if (!connected) setConnected(true);
  }, [connected]);

  useLiveSubscription(sessionId, handleState);

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <WifiOff className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
        <h1 className="font-display text-xl text-foreground">Esperando señal en directo...</h1>
        <p className="text-sm text-muted-foreground">
          El partido aún no ha empezado a transmitirse o la conexión no está disponible.
        </p>
      </div>
    );
  }

  return (
    <>
    <LiveEventNotification events={state.events} />
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2 justify-center">
        <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
        <span className="text-xs font-bold text-green-500 uppercase tracking-wider">En Directo</span>
      </div>

      {/* Match info */}
      {(state.matchDate || state.matchTime) && (
        <div className="text-center text-xs text-muted-foreground">
          {state.matchDate} {state.matchTime}
        </div>
      )}

      {/* Scoreboard */}
      <div className="field-gradient rounded-xl border p-6 text-center space-y-4">
        <div className="timer-display text-5xl text-foreground">
          <LiveTimer
            seconds={state.timerSeconds}
            running={state.timerRunning}
            lastUpdate={state.timerLastUpdate}
          />
        </div>
        <div className="flex items-center justify-center gap-6">
          {/* Home */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
              {state.homeTeamName || 'Local'}
            </span>
            <div className="flex items-center gap-3">
              <KitDisplay
                kitHtml={state.homeTeamKitHtml}
                kitUrl={state.homeTeamKitUrl}
                alt="Kit Local"
                className="w-14 h-20"
              />
              {state.homeTeamCrest && (
                <img src={state.homeTeamCrest} alt="Escudo" className="w-16 h-16 object-contain" />
              )}
              <div className="scoreboard-number text-foreground">{state.homeScore}</div>
            </div>
          </div>
          <span className="text-3xl text-muted-foreground font-display">–</span>
          {/* Away */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
              {state.awayTeamName || 'Visitante'}
            </span>
            <div className="flex items-center gap-3">
              <div className="scoreboard-number text-foreground">{state.awayScore}</div>
              {state.awayTeamCrest && (
                <img src={state.awayTeamCrest} alt="Escudo" className="w-16 h-16 object-contain" />
              )}
              <KitDisplay
                kitHtml={state.awayTeamKitHtml}
                kitUrl={state.awayTeamKitUrl}
                alt="Kit Visitante"
                className="w-14 h-20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LivePlayerTable
          players={state.homePlayers}
          label={state.homeTeamName || 'Local'}
        />
        <LivePlayerTable
          players={state.awayPlayers}
          label={state.awayTeamName || 'Visitante'}
        />
      </div>

      {/* Events */}
      <EventLog events={state.events} />

      <div className="text-center text-xs text-muted-foreground pt-4">
        MatchControl — Visualización en directo
      </div>
    </div>
    </>
  );
}

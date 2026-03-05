import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Team } from '@/hooks/useTeams';

interface ScoreboardProps {
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number;
  awayScore: number;
  timerDisplay: string;
  running: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
}

export default function Scoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  timerDisplay,
  running,
  onToggleTimer,
  onResetTimer,
}: ScoreboardProps) {
  return (
    <div className="field-gradient rounded-xl border p-6 text-center space-y-4">
      <h2 className="font-display text-lg text-foreground">Cronómetro</h2>
      <div className="timer-display text-5xl text-foreground">{timerDisplay}</div>

      <div className="flex items-center justify-center gap-8">
        {/* Home */}
        <div className="flex flex-col items-center gap-2">
          {homeTeam?.crest_url && (
            <img src={homeTeam.crest_url} alt={homeTeam.name} className="w-14 h-14 object-contain" />
          )}
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
            {homeTeam?.name || 'Local'}
          </span>
          <div className="scoreboard-number text-foreground">{homeScore}</div>
        </div>

        <span className="text-2xl text-muted-foreground font-display">–</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-2">
          {awayTeam?.crest_url && (
            <img src={awayTeam.crest_url} alt={awayTeam.name} className="w-14 h-14 object-contain" />
          )}
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
            {awayTeam?.name || 'Visitante'}
          </span>
          <div className="scoreboard-number text-foreground">{awayScore}</div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button onClick={onToggleTimer} variant={running ? 'warning' : 'success'}>
          {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {running ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button onClick={onResetTimer} variant="destructive">
          <RotateCcw className="mr-1 h-4 w-4" />
          Reiniciar
        </Button>
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Team } from '@/hooks/useTeams';
import KitDisplay from './KitDisplay';

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
    <div className="field-gradient rounded-xl border p-3 sm:p-6 text-center space-y-3 sm:space-y-4">
      <h2 className="font-display text-base sm:text-lg text-foreground">Cronómetro</h2>
      <div className="timer-display text-3xl sm:text-5xl text-foreground">{timerDisplay}</div>

      <div className="flex items-center justify-center gap-3 sm:gap-6">
        {/* Home */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[80px] sm:max-w-[120px]">
            {homeTeam?.name || 'Local'}
          </span>
          <div className="flex items-center gap-1 sm:gap-3">
            <KitDisplay
              kitHtml={homeTeam?.kit_html}
              kitUrl={homeTeam?.kit_url}
              alt={`Kit ${homeTeam?.name}`}
              className="w-8 h-12 sm:w-14 sm:h-20 hidden sm:block"
            />
            {homeTeam?.crest_url && (
              <img src={homeTeam.crest_url} alt={homeTeam.name} className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
            )}
            <div className="scoreboard-number text-3xl sm:text-5xl text-foreground">{homeScore}</div>
          </div>
        </div>

        <span className="text-xl sm:text-3xl text-muted-foreground font-display">–</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[80px] sm:max-w-[120px]">
            {awayTeam?.name || 'Visitante'}
          </span>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="scoreboard-number text-3xl sm:text-5xl text-foreground">{awayScore}</div>
            {awayTeam?.crest_url && (
              <img src={awayTeam.crest_url} alt={awayTeam.name} className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
            )}
            <KitDisplay
              kitHtml={awayTeam?.kit_html}
              kitUrl={awayTeam?.kit_url}
              alt={`Kit ${awayTeam?.name}`}
              className="w-8 h-12 sm:w-14 sm:h-20 hidden sm:block"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button size="sm" onClick={onToggleTimer} variant={running ? 'warning' : 'success'}>
          {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {running ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button size="sm" onClick={onResetTimer} variant="destructive">
          <RotateCcw className="mr-1 h-4 w-4" />
          Reiniciar
        </Button>
      </div>
    </div>
  );
}

import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import { SEASON_LABELS, CURRENT_SEASON } from '@/config/season';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CalendarDays } from 'lucide-react';

const HIDDEN_PREFIXES = ['/formulario', '/entrenamientos/publico', '/tactical/view', '/live'];

export default function ClubSeasonBar() {
  const { user } = useAuth();
  const { clubs, clubId, setClubId, season, setSeason, isCurrentSeason } = useClub();
  const { pathname } = useLocation();

  if (!user || clubs.length === 0) return null;
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur print:hidden">
      <div className="max-w-4xl mx-auto px-3 py-1.5 flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <Select value={clubId || ''} onValueChange={setClubId}>
          <SelectTrigger className="h-8 text-xs sm:text-sm flex-1 min-w-0 bg-card">
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            {clubs.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="h-8 w-[104px] sm:w-[120px] text-xs sm:text-sm bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASON_LABELS.map(s => (
              <SelectItem key={s} value={s}>{s}{s === CURRENT_SEASON ? '' : ' (hist.)'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isCurrentSeason && (
          <span className="hidden sm:inline text-[10px] uppercase tracking-wide text-amber-500 font-semibold">Solo consulta</span>
        )}
      </div>
    </div>
  );
}

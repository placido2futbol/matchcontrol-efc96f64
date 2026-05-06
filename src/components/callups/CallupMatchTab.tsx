import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  opponent: string;
  setOpponent: (v: string) => void;
  matchDate: string;
  setMatchDate: (v: string) => void;
  matchTime: string;
  setMatchTime: (v: string) => void;
  callupTime: string;
  setCallupTime: (v: string) => void;
  callupLocation: string;
  setCallupLocation: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  autofillLoading: boolean;
  onAutofill: () => void;
  hasTeam: boolean;
}

export default function CallupMatchTab({
  opponent, setOpponent, matchDate, setMatchDate, matchTime, setMatchTime,
  callupTime, setCallupTime, callupLocation, setCallupLocation,
  notes, setNotes, autofillLoading, onAutofill, hasTeam,
}: Props) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="sm"
        onClick={onAutofill}
        disabled={autofillLoading || !hasTeam}
        className="w-full h-8 text-xs gap-2 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-destructive-foreground"
      >
        <Download className="h-3.5 w-3.5" />
        {autofillLoading ? 'Cargando desde FCF...' : 'Auto-rellenar desde FCF'}
      </Button>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Rival</label>
        <Input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Nombre del rival" className="h-8 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha partido</label>
          <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora partido</label>
          <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora convocatoria</label>
          <Input type="time" value={callupTime} onChange={e => setCallupTime(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Lugar convocatoria</label>
          <Input value={callupLocation} onChange={e => setCallupLocation(e.target.value)} placeholder="Lugar..." className="h-8 text-xs" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="h-8 text-xs" />
      </div>
    </div>
  );
}

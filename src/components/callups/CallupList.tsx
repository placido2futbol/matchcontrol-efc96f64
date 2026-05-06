import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Calendar, Clock, FileText } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Callup } from './types';
import type { Team } from '@/hooks/useTeams';

interface Props {
  callups: Callup[];
  loading: boolean;
  teams: Team[];
  textClass: string;
  btnClass: string;
  onBack: () => void;
  onNew: () => void;
  onEdit: (c: Callup) => void;
  onDelete: (id: string) => void;
}

export default function CallupList({ callups, loading, teams, textClass, btnClass, onBack, onNew, onEdit, onDelete }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className={btnClass}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className={`font-display text-xl sm:text-2xl ${textClass}`}>📋 Convocatorias</h1>
        </div>
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : callups.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No hay convocatorias</p>
            <p className="text-sm text-muted-foreground/70 mt-1">¡Crea tu primera convocatoria!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {callups.map(c => {
            const team = teams.find(t => t.id === c.team_id);
            const st = c.players.filter(p => p.status === 'starter').length;
            const su = c.players.filter(p => p.status === 'substitute').length;
            return (
              <div key={c.id} className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                onClick={() => onEdit(c)}>
                <div className="flex items-center gap-3">
                  {team?.crest_url && <img src={team.crest_url} alt="" className="h-10 w-10 object-contain" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{team?.name || 'Equipo'}</span>
                      {c.opponent && <span className="text-muted-foreground text-xs">vs {c.opponent}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {c.match_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.match_date}</span>}
                      {c.match_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.match_time}</span>}
                      <span>{st} titulares · {su} suplentes</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setDeleteId(c.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar convocatoria?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


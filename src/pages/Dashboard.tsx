import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut, BarChart3, Trash2, Pencil, Calendar, Clock, ChevronRight, Trophy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface MatchSummary {
  id: string;
  match_date: string | null;
  match_time: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchMatches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('matches')
      .select('id, match_date, match_time, home_team_name, away_team_name, home_score, away_score, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete related data first, then the match
    await supabase.from('match_events').delete().eq('match_id', deleteId);
    await supabase.from('match_players').delete().eq('match_id', deleteId);
    const { error } = await supabase.from('matches').delete().eq('id', deleteId);
    if (error) {
      toast.error('Error eliminando partido');
    } else {
      toast.success('Partido eliminado');
      setMatches(prev => prev.filter(m => m.id !== deleteId));
    }
    setDeleteId(null);
  };

  const matchToDelete = matches.find(m => m.id === deleteId);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl sm:text-2xl text-foreground">⚽ MatchControl</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/match')}
          className="group relative overflow-hidden rounded-xl bg-primary p-4 sm:p-5 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-white/20 p-3 transition-transform duration-300 group-hover:rotate-90">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Nuevo Partido</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/teams')}
          className="group relative overflow-hidden rounded-xl bg-accent p-4 sm:p-5 text-accent-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-white/20 p-3 transition-transform duration-300 group-hover:scale-110">
              <Users className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Gestión Equipos</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/sant-pau-stats')}
          className="group relative overflow-hidden rounded-xl bg-secondary p-4 sm:p-5 text-secondary-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-primary/15 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Estadísticas</span>
          </div>
        </button>
      </div>

      {/* Match history */}
      <div>
        <h2 className="font-display text-lg mb-3 flex items-center gap-2 text-foreground">
          <History className="h-5 w-5" /> Historial de Partidos
        </h2>
        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay partidos guardados. ¡Crea tu primer partido!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {matches.map(m => (
              <Card key={m.id} className="match-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/match/${m.id}`)}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{m.home_team_name}</span>
                      <span className="font-display text-lg text-foreground">
                        {m.home_score} - {m.away_score}
                      </span>
                      <span className="font-bold text-sm text-foreground">{m.away_team_name}</span>
                      {m.status === 'in_progress' && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">En curso</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.match_date || 'Sin fecha'} {m.match_time || ''} · {m.status === 'finished' ? 'Finalizado' : 'En curso'}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.status === 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); navigate(`/match/edit/${m.id}`); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este partido?</AlertDialogTitle>
            <AlertDialogDescription>
              {matchToDelete && (
                <>
                  <span className="font-bold">{matchToDelete.home_team_name} {matchToDelete.home_score} - {matchToDelete.away_score} {matchToDelete.away_team_name}</span>
                  <br />
                </>
              )}
              Esta acción no se puede deshacer. Se eliminarán todos los datos del partido, jugadores e incidencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

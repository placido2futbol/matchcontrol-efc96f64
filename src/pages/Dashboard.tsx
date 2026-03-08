import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut, BarChart3, Trash2, Pencil, Calendar, ChevronRight, Trophy, PenTool, Settings, Palette, Image, X } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { FCF_EQUIPOS_DB } from '@/data/fcf-teams';
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
  const ADMIN_EMAILS = ['pinilla.22@gmail.com', 'placido.futbol2@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

        {isAdmin && (
          <button
            onClick={() => navigate('/tactical')}
            className="group relative overflow-hidden rounded-xl bg-card border-2 border-primary/20 p-4 sm:p-5 text-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-primary/50 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-2">
              <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
                <PenTool className="h-6 w-6" />
              </div>
              <span className="font-display text-sm sm:text-base tracking-wide">Pizarra Táctica</span>
            </div>
          </button>
        )}
      </div>

      {/* Match history */}
      <div>
        <h2 className="font-display text-lg mb-4 flex items-center gap-2 text-foreground">
          <History className="h-5 w-5 text-primary" /> Historial de Partidos
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : matches.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No hay partidos guardados</p>
              <p className="text-sm text-muted-foreground/70 mt-1">¡Crea tu primer partido!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map(m => {
              const isLive = m.status === 'in_progress';
              const homeWin = m.home_score > m.away_score;
              const awayWin = m.away_score > m.home_score;
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${isLive ? 'border-accent/50 ring-1 ring-accent/20' : 'hover:border-primary/30'}`}
                >
                  {isLive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-warning to-accent animate-pulse" />
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-end flex-1 min-w-0">
                        <span className={`font-display text-sm sm:text-base truncate max-w-full ${homeWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.home_team_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`font-display text-2xl sm:text-3xl w-8 text-center ${homeWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.home_score}
                        </span>
                        <span className="text-muted-foreground/40 font-display text-lg">:</span>
                        <span className={`font-display text-2xl sm:text-3xl w-8 text-center ${awayWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.away_score}
                        </span>
                      </div>

                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className={`font-display text-sm sm:text-base truncate max-w-full ${awayWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.away_team_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        {m.match_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {m.match_date}
                          </span>
                        )}
                        {isLive ? (
                          <span className="text-xs font-semibold text-accent flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> En curso
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">Finalizado</span>
                        )}
                      </div>

                      {isLive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); navigate(`/match/edit/${m.id}`); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Mobile date */}
                  <div className="sm:hidden mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {m.match_date && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {m.match_date}</span>
                    )}
                    {isLive ? (
                      <span className="font-semibold text-accent flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> En curso
                      </span>
                    ) : (
                      <span>Finalizado</span>
                    )}
                  </div>
                </div>
              );
            })}
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

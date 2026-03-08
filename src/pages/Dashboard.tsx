import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut, BarChart3, Trash2, Pencil } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">⚽ MatchControl</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> Salir
        </Button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button onClick={() => navigate('/match')} className="h-16 text-base">
          <Plus className="h-5 w-5 mr-2" /> Nuevo Partido
        </Button>
        <Button variant="outline" onClick={() => navigate('/teams')} className="h-16 text-base">
          <Users className="h-5 w-5 mr-2" /> Gestión Equipos
        </Button>
        <Button variant="outline" onClick={() => navigate('/sant-pau-stats')} className="h-16 text-base">
          <BarChart3 className="h-5 w-5 mr-2" /> Estadísticas SP
        </Button>
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

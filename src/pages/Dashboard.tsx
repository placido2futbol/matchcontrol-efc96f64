import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut } from 'lucide-react';

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, match_date, match_time, home_team_name, away_team_name, home_score, away_score, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setMatches(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">⚽ Ficha Partido</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" /> Salir
        </Button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => navigate('/match')} className="h-16 text-base">
          <Plus className="h-5 w-5 mr-2" /> Nuevo Partido
        </Button>
        <Button variant="outline" onClick={() => navigate('/teams')} className="h-16 text-base">
          <Users className="h-5 w-5 mr-2" /> Gestión Equipos
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
              <Card key={m.id} className="match-card cursor-pointer" onClick={() => navigate(`/match/${m.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{m.home_team_name}</span>
                      <span className="font-display text-lg text-foreground">
                        {m.home_score} - {m.away_score}
                      </span>
                      <span className="font-bold text-sm text-foreground">{m.away_team_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.match_date || 'Sin fecha'} {m.match_time || ''} · {m.status === 'finished' ? 'Finalizado' : 'En curso'}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

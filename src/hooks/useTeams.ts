import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  crest_url: string;
  kit_url: string;
  kit_html: string;
  fcf_url: string;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  dorsal: string;
  photo_url: string;
}

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) return;
    setLoading(true);
    const { data: teamsData, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) { toast.error('Error cargando equipos'); return; }

    const teamsWithPlayers: Team[] = [];
    for (const t of teamsData || []) {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', t.id)
        .order('name');

      teamsWithPlayers.push({
        id: t.id,
        name: t.name,
        crest_url: t.crest_url || '',
        kit_url: t.kit_url || '',
        kit_html: t.kit_html || '',
        fcf_url: t.fcf_url || '',
        players: (playersData || []).map(p => ({
          id: p.id,
          name: p.name,
          dorsal: p.dorsal || '',
          photo_url: p.photo_url || '',
        })),
      });
    }

    setTeams(teamsWithPlayers);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  const saveTeam = async (
    name: string,
    crestUrl: string,
    kitUrl: string,
    fcfUrl: string,
    players: { name: string; dorsal: string; photo_url?: string }[],
    editId?: string,
    kitHtml?: string
  ) => {
    if (!user) return;

    if (editId) {
      const { error } = await supabase
        .from('teams')
        .update({ name, crest_url: crestUrl, kit_url: kitUrl, kit_html: kitHtml || '', fcf_url: fcfUrl })
        .eq('id', editId);
      if (error) { toast.error('Error actualizando equipo'); return; }

      await supabase.from('players').delete().eq('team_id', editId);
      if (players.length > 0) {
        await supabase.from('players').insert(
          players.map(p => ({ team_id: editId, name: p.name, dorsal: p.dorsal }))
        );
      }
    } else {
      const { data, error } = await supabase
        .from('teams')
        .insert({ user_id: user.id, name, crest_url: crestUrl, kit_url: kitUrl, kit_html: kitHtml || '', fcf_url: fcfUrl })
        .select()
        .single();
      if (error || !data) { toast.error('Error guardando equipo'); return; }

      if (players.length > 0) {
        await supabase.from('players').insert(
          players.map(p => ({ team_id: data.id, name: p.name, dorsal: p.dorsal }))
        );
      }
    }

    toast.success('Equipo guardado');
    await fetchTeams();
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) { toast.error('Error eliminando equipo'); return; }
    toast.success('Equipo eliminado');
    await fetchTeams();
  };

  return { teams, loading, saveTeam, deleteTeam, refetch: fetchTeams };
}

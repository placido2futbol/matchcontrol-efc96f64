import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import { TacticalPlayer, generateId } from './types';
import { FCF_EQUIPOS_DB } from '@/data/fcf-teams';

interface RosterPlayer {
  name: string;
  shortName: string;
  dorsal: string;
  photoUrl: string;
}

interface RosterPanelProps {
  onAddPlayer: (player: Partial<TacticalPlayer>) => void;
}


function getShortName(fullName: string): string {
  // "APELLIDO APELLIDO, NOMBRE" → "NOMBRE"
  const parts = fullName.split(',');
  if (parts.length > 1) {
    return parts[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
}

export default function RosterPanel({ onAddPlayer }: RosterPanelProps) {
  const { user } = useAuth();
  const { club, clubId } = useClub();
  const SANT_PAU_KEY = (club?.name_key || "SANT PAU D'ORDAL").toUpperCase();
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) {
        loadFromStatic();
        return;
      }

      // Try loading from DB first
      let tq = supabase.from('teams').select('id, name').eq('user_id', user.id);
      if (clubId) tq = tq.eq('club_id', clubId);
      const { data: teams } = await tq;

      const spTeam = (teams || []).find(t =>
        t.name.toUpperCase().includes(SANT_PAU_KEY)
      );

      if (spTeam) {
        const { data: dbPlayers } = await supabase
          .from('players')
          .select('name, dorsal, photo_url')
          .eq('team_id', spTeam.id)
          .order('name');

        if (dbPlayers && dbPlayers.length > 0) {
          setPlayers(dbPlayers.map(p => ({
            name: p.name,
            shortName: getShortName(p.name),
            dorsal: p.dorsal || '',
            photoUrl: p.photo_url || '',
          })));
          setLoading(false);
          return;
        }
      }

      // Fallback to static data
      loadFromStatic();
    }

    function loadFromStatic() {
      const spTeam = FCF_EQUIPOS_DB.find(t =>
        t.name.toUpperCase().includes(SANT_PAU_KEY)
      );
      if (spTeam) {
        setPlayers(spTeam.players.map(name => ({
          name,
          shortName: getShortName(name),
          dorsal: '',
          photoUrl: '',
        })));
      }
      setLoading(false);
    }

    load();
  }, [user, clubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
        {club?.short_name || "Sant Pau d'Ordal"} ({players.length})
      </h3>
      <div className="flex flex-wrap gap-1">
        {players.map((p, i) => (
          <button
            key={i}
            onClick={() => onAddPlayer({
              name: p.shortName,
              number: p.dorsal ? parseInt(p.dorsal) || (i + 1) : i + 1,
              color: '#3B82F6',
              team: 'home',
            })}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/15 hover:ring-1 hover:ring-primary/30 transition-all text-left group"
            title={p.name}
          >
            {p.photoUrl ? (
              <img src={p.photoUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                {p.dorsal || (i + 1)}
              </div>
            )}
            <span className="text-[10px] font-semibold text-foreground truncate max-w-[60px] group-hover:text-primary">
              {p.shortName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

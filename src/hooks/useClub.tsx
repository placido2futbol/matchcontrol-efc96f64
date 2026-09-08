import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CURRENT_SEASON, SEASON_LABELS } from '@/config/season';

export interface Club {
  id: string;
  name: string;
  /** Upper-case fragment used to recognise this club inside match team names */
  name_key: string;
  short_name: string;
  fcf_url: string;
  crest_url: string;
  sort_order: number;
}

interface ClubContextValue {
  clubs: Club[];
  club: Club | null;
  clubId: string | null;
  setClubId: (id: string) => void;
  season: string;
  setSeason: (s: string) => void;
  isCurrentSeason: boolean;
  loading: boolean;
  /** true when a team name belongs to the selected club */
  isClubTeam: (name?: string | null) => boolean;
}

const ClubContext = createContext<ClubContextValue | undefined>(undefined);

const LS_CLUB = 'mc_selected_club';
const LS_SEASON = 'mc_selected_season';

const DEFAULT_CLUBS = [
  { name: "SANT PAU D'ORDAL, U.E. A", name_key: "SANT PAU D'ORDAL", short_name: "Sant Pau d'Ordal", fcf_url: 'https://www.fcf.cat/equip/2627/4cat/sant-pau-dordal-ue-a', sort_order: 0 },
  { name: 'SUBIRATS UNIÓ ESPORTIVA – Juvenil', name_key: 'SUBIRATS', short_name: 'Subirats Juvenil', fcf_url: 'https://www.fcf.cat/ca/clubs/19635628/categories/26118703', sort_order: 1 },
];

export function ClubProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubIdState] = useState<string | null>(() => localStorage.getItem(LS_CLUB));
  const [season, setSeasonState] = useState<string>(() => {
    const s = localStorage.getItem(LS_SEASON);
    return s && SEASON_LABELS.includes(s) ? s : CURRENT_SEASON;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setClubs([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      let { data } = await supabase.from('clubs').select('*').eq('user_id', user.id).order('sort_order');
      if (!data || data.length === 0) {
        const { data: created } = await supabase
          .from('clubs')
          .insert(DEFAULT_CLUBS.map(c => ({ ...c, user_id: user.id })))
          .select();
        data = created || [];
      }
      const list: Club[] = (data || []).map(c => ({
        id: c.id, name: c.name, name_key: c.name_key, short_name: c.short_name || c.name,
        fcf_url: c.fcf_url || '', crest_url: c.crest_url || '', sort_order: c.sort_order,
      }));
      setClubs(list);
      setClubIdState(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id || null));
      setLoading(false);
    })();
  }, [user]);

  const setClubId = (id: string) => { localStorage.setItem(LS_CLUB, id); setClubIdState(id); };
  const setSeason = (s: string) => { localStorage.setItem(LS_SEASON, s); setSeasonState(s); };

  const club = useMemo(() => clubs.find(c => c.id === clubId) || null, [clubs, clubId]);

  const value: ClubContextValue = {
    clubs, club, clubId: club?.id || null, setClubId,
    season, setSeason, isCurrentSeason: season === CURRENT_SEASON, loading,
    isClubTeam: (name) => !!club && !!name && name.toUpperCase().includes(club.name_key.toUpperCase()),
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}

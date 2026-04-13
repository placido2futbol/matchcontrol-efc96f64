
CREATE TABLE public.callups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  match_date date,
  match_time time,
  opponent text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.callups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own callups" ON public.callups FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own callups" ON public.callups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own callups" ON public.callups FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own callups" ON public.callups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.callup_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  callup_id uuid NOT NULL REFERENCES public.callups(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  dorsal text DEFAULT '',
  photo_url text DEFAULT '',
  status text NOT NULL DEFAULT 'called',
  position_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.callup_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view callup_players of own callups" ON public.callup_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.callups WHERE callups.id = callup_players.callup_id AND callups.user_id = auth.uid()));
CREATE POLICY "Users can insert callup_players to own callups" ON public.callup_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.callups WHERE callups.id = callup_players.callup_id AND callups.user_id = auth.uid()));
CREATE POLICY "Users can update callup_players of own callups" ON public.callup_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.callups WHERE callups.id = callup_players.callup_id AND callups.user_id = auth.uid()));
CREATE POLICY "Users can delete callup_players of own callups" ON public.callup_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.callups WHERE callups.id = callup_players.callup_id AND callups.user_id = auth.uid()));

CREATE TRIGGER update_callups_updated_at BEFORE UPDATE ON public.callups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

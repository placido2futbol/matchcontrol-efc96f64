
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crest_url TEXT DEFAULT '',
  kit_url TEXT DEFAULT '',
  kit_html TEXT DEFAULT '',
  fcf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own teams" ON public.teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own teams" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own teams" ON public.teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dorsal TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view players of own teams" ON public.players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can insert players to own teams" ON public.players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can update players of own teams" ON public.players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()));
CREATE POLICY "Users can delete players of own teams" ON public.players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()));

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_date DATE,
  match_time TIME,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_team_name TEXT NOT NULL DEFAULT '',
  away_team_name TEXT NOT NULL DEFAULT '',
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  halftime_result TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own matches" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Match events (goals, cards, substitutions)
CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute INT NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL,
  team_side TEXT NOT NULL,
  player_name TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events of own matches" ON public.match_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_events.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can insert events to own matches" ON public.match_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_events.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete events of own matches" ON public.match_events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_events.match_id AND matches.user_id = auth.uid()));

-- Match players (lineup for each match)
CREATE TABLE public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  dorsal TEXT DEFAULT '',
  team_side TEXT NOT NULL,
  is_starter BOOLEAN NOT NULL DEFAULT true,
  goals INT NOT NULL DEFAULT 0,
  yellow_cards INT NOT NULL DEFAULT 0,
  red_card BOOLEAN NOT NULL DEFAULT false,
  minutes_played INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view match_players of own matches" ON public.match_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can insert match_players to own matches" ON public.match_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update match_players of own matches" ON public.match_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete match_players of own matches" ON public.match_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = match_players.match_id AND matches.user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

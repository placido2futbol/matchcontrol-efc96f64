CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  name_key text NOT NULL,
  short_name text,
  fcf_url text,
  crest_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clubs" ON public.clubs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teams ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN season text NOT NULL DEFAULT '2026/27';
ALTER TABLE public.matches ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.callups ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.training_sessions ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.tactical_boards ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.fcf_competitions ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX idx_teams_club_season ON public.teams(club_id, season);
CREATE INDEX idx_matches_club_season ON public.matches(club_id, season);
CREATE INDEX idx_callups_club_season ON public.callups(club_id, season);
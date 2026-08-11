-- 1. Seasons catalog
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  fcf_season_id integer,
  is_active boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seasons TO authenticated;
GRANT SELECT ON public.seasons TO anon;
GRANT ALL ON public.seasons TO service_role;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are readable by authenticated users"
ON public.seasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Seasons are readable publicly"
ON public.seasons FOR SELECT TO anon USING (true);

CREATE TRIGGER update_seasons_updated_at
BEFORE UPDATE ON public.seasons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seasons (label, fcf_season_id, is_active, is_archived)
VALUES ('2025/26', 21, false, true),
       ('2026/27', 22, true, false);

-- 2. FCF competition mapping (internal category <-> FCF ids), resolved by name not just id
CREATE TABLE public.fcf_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_label text NOT NULL,
  fcf_season_id integer,
  internal_category text NOT NULL,
  competition_name text,
  group_name text,
  discipline_id text,
  competition_id text,
  group_id text,
  status text NOT NULL DEFAULT 'pending',
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_label, internal_category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcf_competitions TO authenticated;
GRANT ALL ON public.fcf_competitions TO service_role;

ALTER TABLE public.fcf_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own fcf competitions"
ON public.fcf_competitions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_fcf_competitions_updated_at
BEFORE UPDATE ON public.fcf_competitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Attach season to sporting records (non destructive)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE public.callups ADD COLUMN IF NOT EXISTS season text;

UPDATE public.matches SET season = '2025/26' WHERE season IS NULL;
UPDATE public.callups SET season = '2025/26' WHERE season IS NULL;
UPDATE public.training_sessions SET season = '2025/26' WHERE season IS NULL OR season = '';

ALTER TABLE public.matches ALTER COLUMN season SET DEFAULT '2026/27';
ALTER TABLE public.callups ALTER COLUMN season SET DEFAULT '2026/27';
ALTER TABLE public.training_sessions ALTER COLUMN season SET DEFAULT '2026/27';

ALTER TABLE public.matches ALTER COLUMN season SET NOT NULL;
ALTER TABLE public.callups ALTER COLUMN season SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_season ON public.matches(season);
CREATE INDEX IF NOT EXISTS idx_callups_season ON public.callups(season);
CREATE INDEX IF NOT EXISTS idx_training_sessions_season ON public.training_sessions(season);

-- 4. Prevent duplicated imports of the same fixture within a season
CREATE UNIQUE INDEX IF NOT EXISTS uniq_match_season_fixture
ON public.matches (user_id, season, match_date, home_team_name, away_team_name)
WHERE match_date IS NOT NULL;
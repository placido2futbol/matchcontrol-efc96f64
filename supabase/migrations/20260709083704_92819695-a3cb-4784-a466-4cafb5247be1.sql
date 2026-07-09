
CREATE TABLE public.training_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  task_type text,
  didactic_form text,
  difficulty text,
  demand text,
  space text,
  players_count text,
  work_time text,
  rest_time text,
  complexity text,
  competitiveness text,
  description text,
  image_url text,
  material text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_tasks TO authenticated;
GRANT ALL ON public.training_tasks TO service_role;
ALTER TABLE public.training_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tt_select_own" ON public.training_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tt_insert_own" ON public.training_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tt_update_own" ON public.training_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tt_delete_own" ON public.training_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER training_tasks_updated_at BEFORE UPDATE ON public.training_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  microcycle text,
  session_number text,
  session_date date,
  category text,
  season text,
  coach text,
  objective text,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_select_own_or_template" ON public.training_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_template = true);
CREATE POLICY "ts_insert_own" ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ts_update_own" ON public.training_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ts_delete_own" ON public.training_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER training_sessions_updated_at BEFORE UPDATE ON public.training_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.session_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.training_tasks(id) ON DELETE SET NULL,
  order_index int NOT NULL DEFAULT 0,
  custom_notes text,
  task_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_tasks TO authenticated;
GRANT ALL ON public.session_tasks TO service_role;
ALTER TABLE public.session_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select" ON public.session_tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.is_template = true))
);
CREATE POLICY "st_modify_own_session" ON public.session_tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

CREATE TABLE public.shared_training_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_training_links TO authenticated;
GRANT ALL ON public.shared_training_links TO service_role;
ALTER TABLE public.shared_training_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stl_select_own" ON public.shared_training_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "stl_insert_own" ON public.shared_training_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stl_delete_own" ON public.shared_training_links FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_shared_training_session(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link record;
  _session record;
  _tasks jsonb;
BEGIN
  SELECT * INTO _link FROM public.shared_training_links WHERE token = _token AND is_public = true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _link.expires_at IS NOT NULL AND _link.expires_at < now() THEN RETURN NULL; END IF;
  SELECT * INTO _session FROM public.training_sessions WHERE id = _link.session_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'order_index')::int), '[]'::jsonb) INTO _tasks
  FROM (
    SELECT jsonb_build_object(
      'order_index', st.order_index,
      'custom_notes', st.custom_notes,
      'task_snapshot', st.task_snapshot,
      'task', row_to_json(tt.*)
    ) AS t
    FROM public.session_tasks st
    LEFT JOIN public.training_tasks tt ON tt.id = st.task_id
    WHERE st.session_id = _session.id
  ) x;
  RETURN jsonb_build_object('session', row_to_json(_session), 'tasks', _tasks);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_training_session(text) TO anon, authenticated;

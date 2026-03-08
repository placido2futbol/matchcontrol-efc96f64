
CREATE TABLE public.tactical_boards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Pizarra Táctica',
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tactical_boards ENABLE ROW LEVEL SECURITY;

-- Anyone can view (for sharing)
CREATE POLICY "Anyone can view tactical boards"
  ON public.tactical_boards
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only owner can insert
CREATE POLICY "Users can insert own tactical boards"
  ON public.tactical_boards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only owner can update
CREATE POLICY "Users can update own tactical boards"
  ON public.tactical_boards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only owner can delete
CREATE POLICY "Users can delete own tactical boards"
  ON public.tactical_boards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

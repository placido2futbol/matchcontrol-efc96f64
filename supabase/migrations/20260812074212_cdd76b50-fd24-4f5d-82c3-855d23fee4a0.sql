ALTER TABLE public.training_tasks
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS total_time text,
  ADD COLUMN IF NOT EXISTS partial_time text,
  ADD COLUMN IF NOT EXISTS repetitions text,
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
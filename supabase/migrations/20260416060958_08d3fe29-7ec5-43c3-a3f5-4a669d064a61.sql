ALTER TABLE public.callups ADD COLUMN callup_time time without time zone DEFAULT NULL;
ALTER TABLE public.callups ADD COLUMN callup_location text DEFAULT '';
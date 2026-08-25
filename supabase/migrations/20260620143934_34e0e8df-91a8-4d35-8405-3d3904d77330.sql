ALTER TABLE public.trains
  ADD COLUMN IF NOT EXISTS stops jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS trains_stops_gin ON public.trains USING gin (stops);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRAINS
CREATE TABLE public.trains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number TEXT NOT NULL UNIQUE,
  train_name TEXT NOT NULL,
  source_code TEXT NOT NULL,
  source_station TEXT NOT NULL,
  destination_code TEXT NOT NULL,
  destination_station TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  duration TEXT NOT NULL,
  distance_km INT NOT NULL,
  days_of_week TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  classes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trains TO anon, authenticated;
GRANT ALL ON public.trains TO service_role;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trains" ON public.trains FOR SELECT TO anon, authenticated USING (true);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  train_id UUID NOT NULL REFERENCES public.trains(id),
  train_number TEXT NOT NULL,
  train_name TEXT NOT NULL,
  source_code TEXT NOT NULL,
  source_station TEXT NOT NULL,
  destination_code TEXT NOT NULL,
  destination_station TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  journey_date DATE NOT NULL,
  class_code TEXT NOT NULL,
  class_name TEXT NOT NULL,
  total_fare NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  payment_status TEXT NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- PASSENGERS
CREATE TABLE public.passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT NOT NULL,
  gender TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  berth_preference TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.passengers TO authenticated;
GRANT ALL ON public.passengers TO service_role;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own passengers" ON public.passengers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Users insert own passengers" ON public.passengers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
CREATE POLICY "Users update own passengers" ON public.passengers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

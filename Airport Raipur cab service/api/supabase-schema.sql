-- Supabase schema for Airport Booking System

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  password text not null,
  name text not null,
  phone text not null,
  role text not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id text primary key,
  name text not null,
  email text unique not null,
  phone text not null,
  license text unique not null,
  vehicle text not null,
  vehicle_no text not null,
  status text not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id text primary key,
  date timestamptz unique not null,
  morning_available boolean not null default true,
  evening_available boolean not null default true,
  max_bookings int not null default 10,
  current_bookings int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id text primary key,
  booking_number text unique not null,
  user_id text not null references public.users(id) on delete cascade,
  driver_id text references public.drivers(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  pickup_location text not null,
  dropoff_location text not null,
  pickup_date timestamptz not null,
  pickup_time text not null,
  trip_type text not null,
  status text not null default 'PENDING',
  price numeric not null,
  payment_status text not null default 'PENDING',
  payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_bookings_pickup_date on public.bookings (pickup_date);
create index if not exists idx_availability_date on public.availability (date);
create index if not exists idx_bookings_status on public.bookings (status);

-- RLS configuration (enable but allow admin service role)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust as needed)
DROP POLICY IF EXISTS "Allow read for all" ON public.availability;
DROP POLICY IF EXISTS "Allow read for all users" ON public.bookings;
DROP POLICY IF EXISTS "allow read users" ON public.users;
DROP POLICY IF EXISTS "allow read drivers" ON public.drivers;

CREATE POLICY "allow read availability"
ON public.availability
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow read bookings"
ON public.bookings
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow read users"
ON public.users
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow read drivers"
ON public.drivers
FOR SELECT
TO public
USING (true);

-- Inserts/updates should be done via service role key in backend
create table if not exists public.vehicles (
  id text primary key,
  name text unique not null,
  rate numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS discounted_rate numeric;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow read vehicles" ON public.vehicles;
CREATE POLICY "allow read vehicles" ON public.vehicles FOR SELECT TO public USING (active = true);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_rate numeric;
-- Promo codes
create table if not exists public.promos (
  id text primary key,
  code text unique not null,
  discount_percent numeric default 0,
  discount_flat numeric default 0,
  max_uses int not null default 0,
  used_count int not null default 0,
  active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow read promos" ON public.promos;
CREATE POLICY "allow read promos" ON public.promos FOR SELECT TO public USING (active = true);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS promo_discount_amount numeric;

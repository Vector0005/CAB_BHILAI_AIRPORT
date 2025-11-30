import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

// Allow self-signed certificate for Supabase Postgres connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const sqlPath = path.join(process.cwd(), 'supabase-schema.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const conn = process.env.SUPABASE_DB_URL
if (!conn) {
  console.error('Missing SUPABASE_DB_URL in environment. Get it from Supabase → Settings → Database → Connection string.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })

async function main() {
  try {
    await client.connect()
    console.log('Connected to Supabase Postgres')
    try {
      await client.query(sql)
      console.log('Schema applied successfully')
    } catch (err1) {
      console.warn('Initial schema apply failed:', err1.message)
      if (err1.message && err1.message.includes('already exists')) {
        const policyFix = `
          DROP POLICY IF EXISTS "allow read availability" ON public.availability;
          DROP POLICY IF EXISTS "allow read bookings" ON public.bookings;
          DROP POLICY IF EXISTS "allow read users" ON public.users;
          DROP POLICY IF EXISTS "allow read drivers" ON public.drivers;
          CREATE POLICY "allow read availability" ON public.availability FOR SELECT TO public USING (true);
          CREATE POLICY "allow read bookings" ON public.bookings FOR SELECT TO public USING (true);
          CREATE POLICY "allow read users" ON public.users FOR SELECT TO public USING (true);
          CREATE POLICY "allow read drivers" ON public.drivers FOR SELECT TO public USING (true);
        `
        await client.query(policyFix)
        console.log('Policies refreshed successfully')
        const vehiclesDdl = `
          create table if not exists public.vehicles (
            id text primary key,
            name text unique not null,
            rate numeric not null,
            active boolean not null default true,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
          ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "allow read vehicles" ON public.vehicles;
          CREATE POLICY "allow read vehicles" ON public.vehicles FOR SELECT TO public USING (active = true);
          ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id text;
          ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_name text;
          ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_rate numeric;
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
        `
        await client.query(vehiclesDdl)
        console.log('Vehicles schema applied')
      } else {
        throw err1
      }
    }
  } catch (err) {
    console.error('Failed to apply schema:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

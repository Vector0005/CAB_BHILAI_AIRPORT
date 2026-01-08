import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const supabase = createClient(url, key)

async function checkTable(name) {
  const { data, error } = await supabase.from(name).select('*').limit(1)
  if (error && error.message?.includes('relation')) {
    console.log(`Table ${name}: NOT FOUND`)
    return false
  }
  if (error) {
    console.log(`Table ${name}: ERROR`, error.message)
    return false
  }
  console.log(`Table ${name}: OK`)
  return true
}

async function checkColumn(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1)
  if (error && /column/i.test(error.message||'')) { console.log(`Column ${column} on ${table}: NOT FOUND`); return false }
  if (error) { console.log(`Column ${column} on ${table}: ERROR`, error.message); return false }
  console.log(`Column ${column} on ${table}: OK`)
  return true
}

async function main() {
  const ok1 = await checkTable('users')
  const ok2 = await checkTable('drivers')
  const ok3 = await checkTable('availability')
  const ok4 = await checkTable('bookings')
  const ok5 = await checkColumn('bookings','exact_pickup_time')
  const all = ok1 && ok2 && ok3 && ok4
  console.log('Supabase schema status:', (all && ok5) ? 'COMPLETE' : 'INCOMPLETE')
}

main()

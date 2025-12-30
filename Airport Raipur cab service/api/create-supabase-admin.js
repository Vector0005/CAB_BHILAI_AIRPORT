import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
const supabase = createClient(url, key)

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@raipurtaxi.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = 'Admin'
  const phone = '9999999999'

  const hashed = await bcrypt.hash(password, 10)
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).limit(1)
  if (existing && existing.length) {
    console.log('Admin user already exists:', existing[0].id)
    return
  }
  const payload = { id: crypto.randomUUID(), email, password: hashed, name, phone, role: 'ADMIN' }
  const { error } = await supabase.from('users').insert(payload)
  if (error) {
    console.error('Failed to create admin:', error.message)
    process.exit(1)
  }
  console.log('Admin user created:', email)
}

main()

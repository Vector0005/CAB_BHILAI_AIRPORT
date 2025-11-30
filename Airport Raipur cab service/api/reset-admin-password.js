import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL || 'admin@raipurtaxi.com'
const newPassword = process.env.ADMIN_NEW_PASSWORD || 'Admin#12345'

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  try {
    const hashed = await bcrypt.hash(newPassword, 10)
    const { data: rows, error } = await supabase
      .from('users')
      .update({ password: hashed })
      .eq('email', email)
      .eq('role', 'ADMIN')
      .select('id,email')
    if (error) throw error
    if (!rows || !rows.length) {
      console.error('Admin user not found to update')
      process.exit(1)
    }
    console.log('Admin password updated for:', rows[0].email)
  } catch (e) {
    console.error('Failed to reset admin password:', e.message)
    process.exit(1)
  }
}

main()

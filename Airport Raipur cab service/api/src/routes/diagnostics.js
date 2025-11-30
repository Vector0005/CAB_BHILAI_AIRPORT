import express from 'express'
import getSupabaseClient from '../services/supabaseClient.js'

const router = express.Router()
const supabase = getSupabaseClient(true)

router.get('/', async (req, res) => {
  try {
    const env = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    let tables = []
    let reachable = false
    if (supabase) {
      const { data, error } = await supabase.from('bookings').select('id').limit(1)
      reachable = !error
      tables = ['users','drivers','availability','bookings']
    }
    res.json({ env, reachable, tables })
  } catch (err) {
    res.status(500).json({ error: 'Diagnostics failed', details: err.message || String(err) })
  }
})

export default router

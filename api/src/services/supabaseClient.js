import { createClient } from '@supabase/supabase-js'

let cachedClient = null
const SUPABASE_ONLY = (process.env.SUPABASE_ONLY || '').toLowerCase() === 'true'

export function getSupabaseClient(useServiceRole = false) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) return null
  const key = useServiceRole ? service : anon
  if (!key) return null
  if (!cachedClient) {
    cachedClient = createClient(url, key)
  }
  return cachedClient
}

export function ensureSupabaseConfigured() {
  if (SUPABASE_ONLY) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase-only mode enabled but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }
  }
}

export const supabaseOnly = SUPABASE_ONLY

export default getSupabaseClient

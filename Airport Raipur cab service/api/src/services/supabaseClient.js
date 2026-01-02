import { createClient } from '@supabase/supabase-js'

let cachedAnonClient = null
let cachedServiceClient = null
const SUPABASE_ONLY = (process.env.SUPABASE_ONLY || '').toLowerCase() === 'true'

export function getSupabaseClient(useServiceRole = false) {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) return null
  if (useServiceRole) {
    if (!service) return null
    if (!cachedServiceClient) {
      cachedServiceClient = createClient(url, service)
    }
    return cachedServiceClient
  } else {
    if (!anon) return null
    if (!cachedAnonClient) {
      cachedAnonClient = createClient(url, anon)
    }
    return cachedAnonClient
  }
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

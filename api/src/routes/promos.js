import express from 'express'
import { body, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import getSupabaseClient from '../services/supabaseClient.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const { data, error } = await client.from('promos').select('*').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ promos: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch promos', details: err.message })
  }
})

router.get('/validate', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim().toUpperCase()
    const now = new Date().toISOString()
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const { data, error } = await client
      .from('promos')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .lte('valid_from', now)
      .gte('valid_to', now)
      .limit(1)
    if (error) return res.status(500).json({ error: error.message })
    const promo = data && data.length ? data[0] : null
    if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' })
    if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) return res.status(400).json({ error: 'Promo usage limit reached' })
    res.json({ promo })
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate promo', details: err.message })
  }
})

router.post('/', [
  body('code').trim().isLength({ min: 3 }).withMessage('Promo code required'),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('discount_flat').optional().isFloat({ min: 0 }),
  body('max_uses').optional().isInt({ min: 0 }),
  body('valid_from').optional().isISO8601(),
  body('valid_to').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const {
      code,
      discount_percent = 0,
      discount_flat = 0,
      max_uses = 0,
      valid_from = new Date().toISOString(),
      valid_to = new Date(Date.now() + 30*24*60*60*1000).toISOString()
    } = req.body
    const payload = {
      id: uuidv4(),
      code: String(code).toUpperCase(),
      discount_percent: Number(discount_percent),
      discount_flat: Number(discount_flat),
      max_uses: Number(max_uses),
      used_count: 0,
      active: true,
      valid_from,
      valid_to
    }
    const { data, error } = await client.from('promos').insert(payload).select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ promo: data[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create promo', details: err.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const update = {}
    ;['discount_percent','discount_flat','max_uses','active','valid_from','valid_to','code'].forEach(k => {
      if (req.body[k] !== undefined) update[k] = k === 'code' ? String(req.body[k]).toUpperCase() : req.body[k]
    })
    const { data, error } = await client.from('promos').update(update).eq('id', req.params.id).select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.json({ promo: data[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update promo', details: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const { error } = await client.from('promos').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'Promo deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete promo', details: err.message })
  }
})

export default router

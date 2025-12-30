import express from 'express'
import { body, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import getSupabaseClient from '../services/supabaseClient.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const { data, error } = await client.from('vehicles').select('*').order('name', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ vehicles: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: err.message })
  }
})

router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Vehicle name required'),
  body('rate').isFloat({ min: 0 }).withMessage('Valid rate required'),
  body('discounted_rate').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const name = String(req.body.name || '').trim()
    const rate = Number(req.body.rate)
    if (!name || !isFinite(rate) || rate < 0) return res.status(400).json({ error: 'Invalid name or rate' })
    const discounted_rate = req.body.discounted_rate !== undefined ? Number(req.body.discounted_rate) : undefined
    const payload = { id: uuidv4(), name, rate, active: true }
    if (discounted_rate !== undefined) payload.discounted_rate = discounted_rate
    const { data, error } = await client.from('vehicles').insert(payload).select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json({ vehicle: data[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vehicle', details: err.message })
  }
})

router.patch('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Vehicle name required'),
  body('rate').optional().isFloat({ min: 0 }).withMessage('Valid rate required'),
  body('discounted_rate').optional().isFloat({ min: 0 }),
  body('active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const update = {}
    if (req.body.name !== undefined) update.name = req.body.name
    if (req.body.rate !== undefined) update.rate = Number(req.body.rate)
    if (req.body.discounted_rate !== undefined) update.discounted_rate = Number(req.body.discounted_rate)
    if (req.body.active !== undefined) update.active = req.body.active
    const { data, error } = await client.from('vehicles').update(update).eq('id', req.params.id).select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.json({ vehicle: data[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle', details: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (!client) return res.status(500).json({ error: 'Supabase client not configured' })
    const { error } = await client.from('vehicles').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ message: 'Vehicle deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle', details: err.message })
  }
})

export default router

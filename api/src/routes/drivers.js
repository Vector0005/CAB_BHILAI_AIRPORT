import express from 'express';
import { PrismaClient } from '@prisma/client';
import getSupabaseClient from '../services/supabaseClient.js'
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();
const supabase = getSupabaseClient(true)

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    if (supabase) {
      let query = supabase.from('drivers').select('*', { count: 'exact' })
      if (status) query = query.eq('status', status)
      query = query.order('created_at', { ascending: false }).range((page - 1) * limit, (page - 1) * limit + (parseInt(limit) - 1))
      const { data, error, count } = await query
      if (error) throw error
      return res.json({ drivers: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0)/parseInt(limit)) } })
    } else {
      const where = {}
      if (status) where.status = status
      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
        prisma.driver.count({ where })
      ])
      return res.json({ drivers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } })
    }
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get available drivers
router.get('/available', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('drivers').select('*').eq('status', 'AVAILABLE').order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ drivers: data || [] })
    } else {
      const drivers = await prisma.driver.findMany({ where: { status: 'AVAILABLE' }, orderBy: { createdAt: 'desc' } })
      return res.json({ drivers })
    }
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    res.status(500).json({ error: 'Failed to fetch available drivers' });
  }
});

// Get single driver
router.get('/:id', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('drivers').select('*').eq('id', req.params.id).maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Driver not found' })
      return res.json(data)
    } else {
      const driver = await prisma.driver.findUnique({ where: { id: req.params.id } })
      if (!driver) return res.status(404).json({ error: 'Driver not found' })
      return res.json(driver)
    }
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Create new driver
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('license').trim().isLength({ min: 5 }).withMessage('License number required'),
  body('vehicle').trim().isLength({ min: 3 }).withMessage('Vehicle type required'),
  body('vehicleNo').trim().isLength({ min: 5 }).withMessage('Vehicle number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, license, vehicle, vehicleNo } = req.body;

    // Check if driver already exists
    let exists = false
    if (supabase) {
      const { data: byEmail } = await supabase.from('drivers').select('id').eq('email', email).limit(1)
      const { data: byPhone } = await supabase.from('drivers').select('id').eq('phone', phone).limit(1)
      const { data: byLicense } = await supabase.from('drivers').select('id').eq('license', license).limit(1)
      exists = (byEmail&&byEmail.length)||(byPhone&&byPhone.length)||(byLicense&&byLicense.length)
    } else {
      const existingDriver = await prisma.driver.findFirst({ where: { OR: [{ email }, { phone }, { license }] } })
      exists = !!existingDriver
    }

    if (exists) {
      return res.status(400).json({ 
        error: 'Driver already exists with this email, phone, or license' 
      });
    }

    let driver
    if (supabase) {
      const payload = { id: crypto.randomUUID(), name, email, phone, license, vehicle, vehicle_no: vehicleNo, status: 'AVAILABLE' }
      const { data, error } = await supabase.from('drivers').insert(payload).select('*').limit(1)
      if (error) throw error
      driver = data[0]
    } else {
      driver = await prisma.driver.create({ data: { name, email, phone, license, vehicle, vehicleNo, status: 'AVAILABLE' } })
    }

    res.status(201).json({ message: 'Driver created successfully', driver });
  } catch (error) {
    console.error('Driver creation error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Update driver status
router.patch('/:id/status', [
  body('status').isIn(['AVAILABLE', 'BUSY', 'OFFLINE']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const driverId = req.params.id;
    if (supabase) {
      const { data, error } = await supabase.from('drivers').update({ status }).eq('id', driverId).select('*')
      if (error) throw error
      return res.json({ message: 'Driver status updated', driver: data[0] })
    } else {
      const driver = await prisma.driver.update({ where: { id: driverId }, data: { status } })
      return res.json({ message: 'Driver status updated', driver })
    }
  } catch (error) {
    console.error('Driver status update error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Update driver
router.patch('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('vehicle').optional().trim().isLength({ min: 3 }).withMessage('Vehicle type required'),
  body('vehicleNo').optional().trim().isLength({ min: 5 }).withMessage('Vehicle number required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const driverId = req.params.id;
    const { name, phone, vehicle, vehicleNo } = req.body;
    if (supabase) {
      const { data, error } = await supabase.from('drivers').update({ name, phone, vehicle, vehicle_no: vehicleNo }).eq('id', driverId).select('*')
      if (error) throw error
      return res.json({ message: 'Driver updated successfully', driver: data[0] })
    } else {
      const driver = await prisma.driver.update({ where: { id: driverId }, data: { name, phone, vehicle, vehicleNo } })
      return res.json({ message: 'Driver updated successfully', driver })
    }
  } catch (error) {
    console.error('Driver update error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    if (supabase) {
      // Check active bookings in Supabase
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('driver_id', driverId).eq('status', 'CONFIRMED')
      if ((count || 0) > 0) return res.status(400).json({ error: 'Cannot delete driver with active bookings' })
      const { error } = await supabase.from('drivers').delete().eq('id', driverId)
      if (error) throw error
      return res.json({ message: 'Driver deleted successfully' })
    } else {
      const activeBookings = await prisma.booking.count({ where: { driverId, status: 'CONFIRMED' } })
      if (activeBookings > 0) return res.status(400).json({ error: 'Cannot delete driver with active bookings' })
      await prisma.driver.delete({ where: { id: driverId } })
      return res.json({ message: 'Driver deleted successfully' })
    }
  } catch (error) {
    console.error('Driver deletion error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

export default router;

import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import getSupabaseClient from '../services/supabaseClient.js'
import { PrismaClient } from '@prisma/client'
import { syncBookingToSupabase, syncAvailabilityToSupabase } from '../services/supabaseSync.js'

const router = express.Router();
const prisma = new PrismaClient()

// Generate unique booking number
function generateBookingNumber() {
  return 'BK' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// Get all bookings (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, date, userId, page = 1, limit = 10 } = req.query;
    const client = getSupabaseClient(true)
    if (client) {
      let query = client.from('bookings').select('*', { count: 'exact' })
      if (status) query = query.eq('status', status)
      if (userId) query = query.eq('user_id', userId)
      if (date) {
        const startDate = new Date(date); startDate.setHours(0,0,0,0)
        const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1)
        query = query.gte('pickup_date', startDate.toISOString()).lt('pickup_date', endDate.toISOString())
      }
      query = query.order('created_at', { ascending: false }).range((page - 1) * limit, (page - 1) * limit + (parseInt(limit) - 1))
      const { data, error, count } = await query
      if (error) throw error
      return res.json({ bookings: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) } })
    } else {
      const where = {}
      if (status) where.status = status
      if (userId) where.userId = userId
      if (date) {
        const startDate = new Date(date)
        const endDate = new Date(date)
        endDate.setDate(endDate.getDate() + 1)
        where.pickupDate = { gte: startDate, lt: endDate }
      }
      const bookings = await prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) })
      const total = await prisma.booking.count({ where })
      return res.json({ bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } })
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    if (client) {
      const { data, error } = await client.from('bookings').select('*').eq('id', req.params.id).maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Booking not found' })
      return res.json(data)
    } else {
      const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
      if (!booking) return res.status(404).json({ error: 'Booking not found' })
      return res.json(booking)
    }
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('pickupLocation').trim().isLength({ min: 5 }).withMessage('Pickup location required'),
  body('dropoffLocation').trim().isLength({ min: 5 }).withMessage('Dropoff location required'),
  body('pickupDate').isISO8601().withMessage('Valid pickup date required'),
  body('pickupTime').isIn(['morning', 'evening']).withMessage('Pickup time must be morning or evening'),
  body('tripType').isIn(['HOME_TO_AIRPORT', 'AIRPORT_TO_HOME']).withMessage('Trip type required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('flightNumber').optional().isString()
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

  const {
    name,
    phone,
    email,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    pickupTime,
    tripType,
    price,
    notes
  } = req.body;
  const promoCodeRaw = req.body.promoCode || req.body.promo_code || null;
  const vehicleId = req.body.vehicleId || req.body.vehicle_id || null;
  const vehicleName = req.body.vehicleName || req.body.vehicle_name || null;
  const vehicleRate = req.body.vehicleRate || req.body.vehicle_rate || null;
  const flightNumber = req.body.flightNumber || req.body.flight_number || null;

    // Check availability - parse as local day boundary
    const searchDate = parseLocalDateString(pickupDate);
    if (!searchDate || isNaN(searchDate.getTime())) {
      return res.status(400).json({ error: 'Invalid pickup date' });
    }
    
    let canBook = true
    const client = getSupabaseClient(true)
    if (client) {
      const { data: availability } = await client
        .from('availability')
        .select('*')
        .gte('date', searchDate.toISOString())
        .lt('date', new Date(searchDate.getTime() + 86400000).toISOString())
        .order('date', { ascending: true })
        .limit(1)
      if (!availability || !availability.length) {
        // Create default availability on-the-fly
        const { data: created } = await client.from('availability').insert({
          id: uuidv4(),
          date: searchDate.toISOString(),
          morning_available: true,
          evening_available: true,
          max_bookings: 10,
          current_bookings: 0
        }).select('*')
        // Proceed with booking since both slots are open
      } else {
        const avail = availability[0]
        if (pickupTime === 'morning' && !avail.morning_available) canBook = false
        if (pickupTime === 'evening' && !avail.evening_available) canBook = false
      }
    } else {
      const availability = await prisma.availability.findFirst({ where: { date: { gte: searchDate, lt: new Date(searchDate.getTime() + 86400000) } }, orderBy: { date: 'asc' } })
      if (!availability) return res.status(400).json({ error: 'No availability for selected date' })
      if (pickupTime === 'morning' && !availability.morningAvailable) canBook = false
      if (pickupTime === 'evening' && !availability.eveningAvailable) canBook = false
    }
    if (!canBook) return res.status(400).json({ error: `${pickupTime[0].toUpperCase()+pickupTime.slice(1)} slot not available` })

    // Get or create guest user for anonymous bookings
    let userId = null
    {
      const client = getSupabaseClient(true)
      const { data: guest } = await client.from('users').select('id').eq('email', 'guest@raipurtaxi.com').limit(1)
      if (guest && guest.length) {
        userId = guest[0].id
      } else {
        const { data: created } = await client.from('users').insert({
          id: uuidv4(),
          email: 'guest@raipurtaxi.com',
          password: 'guest123',
          name: 'Guest User',
          phone: '0000000000',
          role: 'CUSTOMER'
        }).select('id').single()
        userId = created?.id || null
      }
    }

    // Create booking
  const insertPayload = {
    id: uuidv4(),
    booking_number: generateBookingNumber(),
    user_id: userId,
    name,
    phone,
    email,
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocation,
    pickup_date: searchDate.toISOString(),
    pickup_time: pickupTime,
    trip_type: tripType,
    price,
    notes,
    vehicle_id: vehicleId,
    vehicle_name: vehicleName,
    vehicle_rate: vehicleRate,
    flight_number: flightNumber,
    status: 'PENDING',
    payment_status: 'PENDING'
  }
    if (promoCodeRaw) {
      const code = String(promoCodeRaw).trim().toUpperCase()
      const clientPromo = getSupabaseClient(true)
      if (clientPromo) {
        const nowIso = new Date().toISOString()
        const { data: promos, error: promoErr } = await clientPromo
          .from('promos')
          .select('*')
          .eq('code', code)
          .eq('active', true)
          .lte('valid_from', nowIso)
          .gte('valid_to', nowIso)
          .limit(1)
        if (promoErr) throw promoErr
        const promo = promos && promos.length ? promos[0] : null
        if (!promo) {
          return res.status(400).json({ error: 'Invalid or expired promo code' })
        }
        if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
          return res.status(400).json({ error: 'Promo usage limit reached' })
        }
        const base = Number(price || 0)
        const percent = Number(promo.discount_percent || 0)
        const flat = Number(promo.discount_flat || 0)
        const discount = Math.min(base, Math.max(0, percent > 0 ? (base * percent / 100) : flat))
        insertPayload.promo_code = code
        insertPayload.promo_discount_amount = discount
        await clientPromo.from('promos').update({ used_count: promo.used_count + 1 }).eq('id', promo.id)
      }
    }
    let booking
    const client2 = getSupabaseClient(true)
    if (client2) {
      const { data: bookingRows, error: insertErr } = await client2.from('bookings').insert(insertPayload).select('*')
      if (insertErr) throw insertErr
      booking = bookingRows[0]
    } else {
      booking = await prisma.booking.create({
        data: {
          bookingNumber: insertPayload.booking_number,
          userId,
          name,
          phone,
          email,
          pickupLocation,
          dropoffLocation,
          pickupDate: new Date(pickupDate),
          pickupTime,
          tripType,
          price,
          notes,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        }
      })
    }

    // Sync booking to Supabase
    try { await syncBookingToSupabase(booking) } catch (e) { /* silent sync error */ }

    if (pickupTime === 'morning') {
      const client3 = getSupabaseClient(true)
      if (client3) {
        const startIso = searchDate.toISOString()
        const endIso = new Date(searchDate.getTime() + 86400000).toISOString()
        await client3.from('availability').update({ morning_available: false }).gte('date', startIso).lt('date', endIso)
      } else {
        await prisma.availability.updateMany({ where: { date: { gte: searchDate, lt: new Date(searchDate.getTime() + 86400000) } }, data: { morningAvailable: false } })
      }
    } else {
      const client4 = getSupabaseClient(true)
      if (client4) {
        const startIso = searchDate.toISOString()
        const endIso = new Date(searchDate.getTime() + 86400000).toISOString()
        await client4.from('availability').update({ evening_available: false }).gte('date', startIso).lt('date', endIso)
      } else {
        await prisma.availability.updateMany({ where: { date: { gte: searchDate, lt: new Date(searchDate.getTime() + 86400000) } }, data: { eveningAvailable: false } })
      }
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error?.message || String(error) });
  }
});

// Update booking status
router.patch('/:id/status', [
  body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    let booking
    {
      const client = getSupabaseClient(true)
      if (client) {
        const { data: updatedRows, error } = await client.from('bookings').update({ status }).eq('id', req.params.id).select('*')
        if (error) throw error
        booking = updatedRows[0]
      } else {
        booking = await prisma.booking.update({ where: { id: req.params.id }, data: { status } })
      }
    }

    // Sync booking to Supabase
    try { await syncBookingToSupabase(booking) } catch (e) {}

    res.json({
      message: 'Booking status updated',
      booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Cancel booking
router.patch('/:id/cancel', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    const { data: existing, error: fetchErr } = await client.from('bookings').select('*').eq('id', req.params.id).maybeSingle()
    if (fetchErr) throw fetchErr
    if (!existing) return res.status(404).json({ error: 'Booking not found' })
    if (existing.status === 'COMPLETED') return res.status(400).json({ error: 'Cannot cancel completed booking' })

    const { data: updatedRows, error: updateErr } = await client.from('bookings').update({ status: 'CANCELLED', payment_status: 'REFUNDED' }).eq('id', req.params.id).select('*')
    if (updateErr) throw updateErr
    const updatedBooking = updatedRows[0]

    const searchDate = new Date(existing.pickup_date)
    if (existing.pickup_time === 'morning') {
      await client.from('availability').update({ morning_available: true }).gte('date', searchDate.toISOString()).lt('date', new Date(searchDate.getTime() + 86400000).toISOString())
    } else {
      await client.from('availability').update({ evening_available: true }).gte('date', searchDate.toISOString()).lt('date', new Date(searchDate.getTime() + 86400000).toISOString())
    }

    res.json({ message: 'Booking cancelled successfully', booking: updatedBooking })
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;
function parseLocalDateString(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(n => parseInt(n, 10))
  const dt = new Date(y, (m - 1), d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

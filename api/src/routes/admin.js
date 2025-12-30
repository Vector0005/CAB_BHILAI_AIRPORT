import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import getSupabaseClient from '../services/supabaseClient.js'

const router = express.Router();
const prisma = new PrismaClient();
// Use per-request supabase client to avoid stale/null clients

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get statistics
    let totalBookings, todayBookings, pendingBookings, completedBookings, totalRevenue, todayRevenue, totalUsers, totalDrivers
    if (client) {
      const tb = await client.from('bookings').select('*', { count: 'exact', head: true }); totalBookings = tb.count || 0
      const tdy = await client.from('bookings').select('*', { count: 'exact', head: true }).gte('pickup_date', today.toISOString()).lt('pickup_date', tomorrow.toISOString()); todayBookings = tdy.count || 0
      const pend = await client.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'); pendingBookings = pend.count || 0
      const comp = await client.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'); completedBookings = comp.count || 0
      const tp = await client.from('bookings').select('price').eq('payment_status', 'PAID'); totalRevenue = (tp.data || []).reduce((s, r) => s + Number(r.price || 0), 0)
      const tr = await client.from('bookings').select('price').gte('pickup_date', today.toISOString()).lt('pickup_date', tomorrow.toISOString()).eq('payment_status', 'PAID'); todayRevenue = (tr.data || []).reduce((s, r) => s + Number(r.price || 0), 0)
      const tu = await client.from('users').select('*', { count: 'exact', head: true }); totalUsers = tu.count || 0
      const td = await client.from('drivers').select('*', { count: 'exact', head: true }); totalDrivers = td.count || 0
    } else {
      totalBookings = await prisma.booking.count()
      todayBookings = await prisma.booking.count({ where: { pickupDate: { gte: today, lt: tomorrow } } })
      pendingBookings = await prisma.booking.count({ where: { status: 'PENDING' } })
      completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } })
      const totalPaidAgg = await prisma.booking.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { price: true } })
      totalRevenue = totalPaidAgg._sum.price || 0
      const todayPaidAgg = await prisma.booking.aggregate({ where: { pickupDate: { gte: today, lt: tomorrow }, paymentStatus: 'PAID' }, _sum: { price: true } })
      todayRevenue = todayPaidAgg._sum.price || 0
      totalUsers = await prisma.user.count()
      totalDrivers = await prisma.driver.count()
    }

    // Get recent bookings
    let recentBookings
    if (client) {
      const r = await client.from('bookings').select('*').order('created_at', { ascending: false }).limit(10)
      recentBookings = r.data || []
    } else {
      recentBookings = await prisma.booking.findMany({ take: 10, orderBy: { createdAt: 'desc' } })
    }

    // Get booking trends for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        bookings: 0
      });
    }

    const bookingTrends = await Promise.all(last7Days.map(async (day) => {
      const date = new Date(day.date)
      const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1)
      if (client) {
        const { count } = await client.from('bookings').select('*', { count: 'exact', head: true }).gte('pickup_date', date.toISOString()).lt('pickup_date', nextDate.toISOString())
        return { date: day.date, bookings: count || 0 }
      } else {
        const count = await prisma.booking.count({ where: { pickupDate: { gte: date, lt: nextDate } } })
        return { date: day.date, bookings: count }
      }
    }))

    res.json({
      statistics: {
        totalBookings: totalBookings || 0,
        todayBookings: todayBookings || 0,
        pendingBookings: pendingBookings || 0,
        completedBookings: completedBookings || 0,
        totalRevenue,
        todayRevenue,
        totalUsers: totalUsers || 0,
        totalDrivers: totalDrivers || 0
      },
      recentBookings: recentBookings || [],
      bookingTrends
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all bookings with filters
router.get('/bookings', async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    const { status, date, page = 1, limit = 20, search } = req.query;
    if (client) {
      let query = client.from('bookings').select('*', { count: 'exact' })
      if (status) query = query.eq('status', status)
      if (date) {
        const startDate = new Date(date); startDate.setHours(0,0,0,0)
        const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1)
        query = query.gte('pickup_date', startDate.toISOString()).lt('pickup_date', endDate.toISOString())
      }
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,booking_number.ilike.%${search}%`)
      query = query.order('created_at', { ascending: false }).range((page - 1) * limit, (page - 1) * limit + (parseInt(limit) - 1))
      const { data, error, count } = await query
      if (error) throw error
      return res.json({ bookings: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) } })
    } else {
      const where = {}
      if (status) where.status = status
      if (date) {
        const startDate = new Date(date)
        const endDate = new Date(date); endDate.setDate(endDate.getDate() + 1)
        where.pickupDate = { gte: startDate, lt: endDate }
      }
      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
        prisma.booking.count({ where })
      ])
      return res.json({ bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } })
    }
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Assign driver to booking
router.patch('/bookings/:id/assign-driver', [
  body('driverId').isString().withMessage('Driver ID required')
], async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { driverId } = req.body;
    const bookingId = req.params.id;

    const { data: driverRows } = await client.from('drivers').select('*').eq('id', driverId).limit(1)
    if (!driverRows || !driverRows.length) return res.status(404).json({ error: 'Driver not found' })
    const driver = driverRows[0]
    if (driver.status !== 'AVAILABLE') return res.status(400).json({ error: 'Driver is not available' })
    const { data: bookingRows, error } = await client.from('bookings').update({ driver_id: driverId, status: 'CONFIRMED' }).eq('id', bookingId).select('*')
    if (error) throw error
    await client.from('drivers').update({ status: 'BUSY' }).eq('id', driverId)
    res.json({ message: 'Driver assigned successfully', booking: bookingRows[0] })
  } catch (error) {
    console.error('Driver assignment error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Update booking status
router.patch('/bookings/:id/status', [
  body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const client = getSupabaseClient(true)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const bookingId = req.params.id;
    const { data, error } = await client.from('bookings').update({ status }).eq('id', bookingId).select('*')
    if (error) throw error
    const booking = data[0]
    if (status === 'COMPLETED' && booking?.driver_id) {
      await client.from('drivers').update({ status: 'AVAILABLE' }).eq('id', booking.driver_id)
    }
    res.json({ message: 'Booking status updated', booking })
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Get system settings
router.get('/settings', async (req, res) => {
  try {
    // Get pricing settings
    const pricing = {
      homeToAirport: {
        morning: 800,
        evening: 900
      },
      airportToHome: {
        morning: 800,
        evening: 900
      }
    };

    // Get system settings
    const settings = {
      pricing,
      maxAdvanceBookingDays: 30,
      cancellationPolicy: 'Free cancellation up to 2 hours before pickup',
      contactInfo: {
        phone: '+91-98271-98271',
        email: 'support@raipurtaxi.com',
        address: 'Bhilai, Chhattisgarh'
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get booking analytics
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _count: true
    });

    const bookingsByTripType = await prisma.booking.groupBy({
      by: ['tripType'],
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _count: true
    });

    const revenueByTripType = await prisma.booking.groupBy({
      by: ['tripType'],
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        paymentStatus: 'PAID'
      },
      _sum: { price: true }
    });

    res.json({
      bookingsByStatus,
      bookingsByTripType,
      revenueByTripType,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import getSupabaseClient from '../services/supabaseClient.js'
import { syncAvailabilityToSupabase } from '../services/supabaseSync.js'

const router = express.Router();
const prisma = new PrismaClient();
// Supabase client will be obtained per-request to ensure dotenv has loaded

// Get availability for a specific date or date range
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    const client = getSupabaseClient(true)
    if (client) {
      let query = client.from('availability').select('*')
      if (date) {
        const d = new Date(date); d.setHours(0,0,0,0)
        const next = new Date(d); next.setDate(next.getDate() + 1)
        query = query.gte('date', d.toISOString()).lt('date', next.toISOString())
      } else if (startDate && endDate) {
        query = query.gte('date', new Date(startDate).toISOString()).lte('date', new Date(endDate).toISOString())
      } else if (startDate) {
        query = query.gte('date', new Date(startDate).toISOString())
      }
      query = query.order('date', { ascending: true })
      const { data, error } = await query
      if (error) throw error
      if (date && (!data || data.length === 0)) {
        const { data: created, error: cErr } = await client.from('availability').insert({ id: crypto.randomUUID(), date: new Date(date).toISOString(), morning_available: true, evening_available: true, max_bookings: 10, current_bookings: 0 }).select('*')
        if (cErr) throw cErr
        return res.json(created)
      }
      return res.json(data || [])
    } else {
      const where = {}
      if (date) where.date = new Date(date)
      else if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) }
      else if (startDate) where.date = { gte: new Date(startDate) }
      const availability = await prisma.availability.findMany({ where, orderBy: { date: 'asc' } })
      if (date && availability.length === 0) {
        const defaultAvailability = await prisma.availability.create({ data: { date: new Date(date), morningAvailable: true, eveningAvailable: true, maxBookings: 10, currentBookings: 0 } })
        try { await syncAvailabilityToSupabase(defaultAvailability) } catch (e) {}
        return res.json([defaultAvailability])
      }
      return res.json(availability)
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get availability for a specific date
router.get('/:date', async (req, res) => {
  try {
    const client2 = getSupabaseClient(true)
    if (client2) {
      const d = new Date(req.params.date); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const { data, error } = await client2.from('availability').select('*').gte('date', d.toISOString()).lt('date', next.toISOString()).order('date', { ascending: true }).limit(1)
      if (error) throw error
      if (!data || !data.length) {
        const { data: created, error: cErr } = await client2.from('availability').insert({ id: crypto.randomUUID(), date: d.toISOString(), morning_available: true, evening_available: true, max_bookings: 10, current_bookings: 0 }).select('*')
        if (cErr) throw cErr
        return res.json(created[0])
      }
      return res.json(data[0])
    } else {
      const date = new Date(req.params.date)
      let availability = await prisma.availability.findUnique({ where: { date } })
      if (!availability) {
        availability = await prisma.availability.create({ data: { date, morningAvailable: true, eveningAvailable: true, maxBookings: 10, currentBookings: 0 } })
        try { await syncAvailabilityToSupabase(availability) } catch (e) {}
      }
      return res.json(availability)
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Update availability for a specific date
router.patch('/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date)
    const { morningAvailable, eveningAvailable, maxBookings, currentBookings } = req.body
    const client3 = getSupabaseClient(true)
    if (client3) {
      const updateData = {}
      if (morningAvailable !== undefined) updateData.morning_available = morningAvailable
      if (eveningAvailable !== undefined) updateData.evening_available = eveningAvailable
      if (maxBookings !== undefined) updateData.max_bookings = maxBookings
      if (currentBookings !== undefined) updateData.current_bookings = currentBookings
      const { data, error } = await client3.from('availability').update(updateData).eq('date', date.toISOString()).select('*')
      if (error) throw error
      return res.json({ message: 'Availability updated successfully', availability: data[0] })
    } else {
      const availability = await prisma.availability.upsert({
        where: { date },
        update: {
          morningAvailable: morningAvailable !== undefined ? morningAvailable : undefined,
          eveningAvailable: eveningAvailable !== undefined ? eveningAvailable : undefined,
          maxBookings: maxBookings !== undefined ? maxBookings : undefined,
          currentBookings: currentBookings !== undefined ? currentBookings : undefined
        },
        create: {
          date,
          morningAvailable: morningAvailable !== undefined ? morningAvailable : true,
          eveningAvailable: eveningAvailable !== undefined ? eveningAvailable : true,
          maxBookings: maxBookings || 10,
          currentBookings: currentBookings || 0
        }
      })
      try { await syncAvailabilityToSupabase(availability) } catch (e) {}
      return res.json({ message: 'Availability updated successfully', availability })
    }
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Bulk update availability for date range
router.post('/bulk-update', async (req, res) => {
  try {
    const { startDate, endDate, morningAvailable, eveningAvailable, maxBookings } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const client4 = getSupabaseClient(true)
    if (client4) {
      for (const date of dates) {
        const updateData = {}
        if (morningAvailable !== undefined) updateData.morning_available = morningAvailable
        if (eveningAvailable !== undefined) updateData.evening_available = eveningAvailable
        if (maxBookings !== undefined) updateData.max_bookings = maxBookings
        await client4.from('availability').upsert({ id: crypto.randomUUID(), date: date.toISOString(), ...updateData })
      }
    } else {
      await Promise.all(dates.map(date => prisma.availability.upsert({
        where: { date },
        update: {
          morningAvailable: morningAvailable !== undefined ? morningAvailable : undefined,
          eveningAvailable: eveningAvailable !== undefined ? eveningAvailable : undefined,
          maxBookings: maxBookings !== undefined ? maxBookings : undefined
        },
        create: {
          date,
          morningAvailable: morningAvailable !== undefined ? morningAvailable : true,
          eveningAvailable: eveningAvailable !== undefined ? eveningAvailable : true,
          maxBookings: maxBookings || 10,
          currentBookings: 0
        }
      })))
    }

    res.json({ message: `Availability updated for ${dates.length} dates`, updatedDates: dates.length });
  } catch (error) {
    console.error('Error bulk updating availability:', error);
    res.status(500).json({ error: 'Failed to bulk update availability' });
  }
});

// Initialize availability for next 90 days
router.post('/initialize', async (req, res) => {
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90);

    const dates = [];
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Check which dates already have availability
    let existingAvailability
    const client5 = getSupabaseClient(true)
    if (client5) {
      const { data } = await client5.from('availability').select('date').gte('date', today.toISOString()).lte('date', endDate.toISOString())
      existingAvailability = data || []
    } else {
      existingAvailability = await prisma.availability.findMany({ where: { date: { gte: today, lte: endDate } }, select: { date: true } })
    }

    const existingDates = new Set(existingAvailability.map(a => a.date.toISOString().split('T')[0]));
    
    // Create availability only for dates that don't exist
    const newDates = dates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });

    const client6 = getSupabaseClient(true)
    if (client6) {
      for (const date of newDates) {
        await client6.from('availability').insert({ id: crypto.randomUUID(), date: date.toISOString(), morning_available: true, evening_available: true, max_bookings: 10, current_bookings: 0 })
      }
    } else {
      await Promise.all(newDates.map(date => prisma.availability.create({ data: { date, morningAvailable: true, eveningAvailable: true, maxBookings: 10, currentBookings: 0 } })))
    }

    res.json({
      message: `Initialized availability for ${newDates.length} new dates`,
      totalDates: dates.length,
      existingDates: existingAvailability?.length || 0,
      newDates: newDates.length
    });
  } catch (error) {
    console.error('Error initializing availability:', error);
    res.status(500).json({ error: 'Failed to initialize availability' });
  }
});

export default router;

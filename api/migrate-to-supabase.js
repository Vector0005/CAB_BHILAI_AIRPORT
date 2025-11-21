import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import getSupabaseClient from './src/services/supabaseClient.js'

const prisma = new PrismaClient()
const supabase = getSupabaseClient(true)

async function ensureClient() {
  if (!supabase) {
    console.error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }
}

async function migrateUsers() {
  const users = await prisma.user.findMany()
  if (!users.length) return
  const payload = users.map(u => ({
    id: u.id,
    email: u.email,
    password: u.password,
    name: u.name,
    phone: u.phone,
    role: u.role,
    created_at: u.createdAt,
    updated_at: u.updatedAt
  }))
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

async function migrateDrivers() {
  const drivers = await prisma.driver.findMany()
  if (!drivers.length) return
  const payload = drivers.map(d => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    license: d.license,
    vehicle: d.vehicle,
    vehicle_no: d.vehicleNo,
    status: d.status,
    created_at: d.createdAt,
    updated_at: d.updatedAt
  }))
  const { error } = await supabase.from('drivers').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

async function migrateAvailability() {
  const avs = await prisma.availability.findMany()
  if (!avs.length) return
  const payload = avs.map(a => ({
    id: a.id,
    date: a.date,
    morning_available: a.morningAvailable,
    evening_available: a.eveningAvailable,
    max_bookings: a.maxBookings,
    current_bookings: a.currentBookings,
    created_at: a.createdAt,
    updated_at: a.updatedAt
  }))
  const { error } = await supabase.from('availability').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

async function migrateBookings() {
  const bookings = await prisma.booking.findMany()
  if (!bookings.length) return
  const payload = bookings.map(b => ({
    id: b.id,
    booking_number: b.bookingNumber,
    user_id: b.userId,
    driver_id: b.driverId,
    name: b.name,
    phone: b.phone,
    email: b.email,
    pickup_location: b.pickupLocation,
    dropoff_location: b.dropoffLocation,
    pickup_date: b.pickupDate,
    pickup_time: b.pickupTime,
    trip_type: b.tripType,
    status: b.status,
    price: b.price,
    payment_status: b.paymentStatus,
    payment_intent_id: b.paymentIntentId,
    notes: b.notes,
    created_at: b.createdAt,
    updated_at: b.updatedAt
  }))
  const { error } = await supabase.from('bookings').upsert(payload, { onConflict: 'id' })
  if (error) throw error
}

async function main() {
  await ensureClient()
  console.log('🚀 Starting migration to Supabase...')
  try {
    await migrateUsers(); console.log('✅ Users migrated')
    await migrateDrivers(); console.log('✅ Drivers migrated')
    await migrateAvailability(); console.log('✅ Availability migrated')
    await migrateBookings(); console.log('✅ Bookings migrated')
    console.log('🎉 Migration completed successfully')
  } catch (err) {
    console.error('❌ Migration error:', err.message || err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

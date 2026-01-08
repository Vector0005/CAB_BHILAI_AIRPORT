import getSupabaseClient from './supabaseClient.js'

export async function syncBookingToSupabase(booking) {
  const client = getSupabaseClient(true)
  if (!client) return
  const payload = {
    id: booking.id,
    booking_number: booking.bookingNumber,
    user_id: booking.userId,
    driver_id: booking.driverId,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    pickup_location: booking.pickupLocation,
    dropoff_location: booking.dropoffLocation,
    pickup_date: booking.pickupDate,
    pickup_time: booking.pickupTime,
    exact_pickup_time: booking.exactPickupTime,
    trip_type: booking.tripType,
    status: booking.status,
    price: booking.price,
    payment_status: booking.paymentStatus,
    payment_intent_id: booking.paymentIntentId,
    notes: booking.notes,
    created_at: booking.createdAt,
    updated_at: booking.updatedAt
  }
  await client.from('bookings').upsert(payload, { onConflict: 'id' })
}

export async function syncAvailabilityToSupabase(av) {
  const client = getSupabaseClient(true)
  if (!client) return
  const payload = {
    id: av.id,
    date: av.date,
    morning_available: av.morningAvailable,
    evening_available: av.eveningAvailable,
    max_bookings: av.maxBookings,
    current_bookings: av.currentBookings,
    created_at: av.createdAt,
    updated_at: av.updatedAt
  }
  await client.from('availability').upsert(payload, { onConflict: 'id' })
}

export async function syncUserToSupabase(user) {
  const client = getSupabaseClient(true)
  if (!client) return
  const payload = {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    phone: user.phone,
    role: user.role,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  }
  await client.from('users').upsert(payload, { onConflict: 'id' })
}

export async function syncDriverToSupabase(driver) {
  const client = getSupabaseClient(true)
  if (!client) return
  const payload = {
    id: driver.id,
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    license: driver.license,
    vehicle: driver.vehicle,
    vehicle_no: driver.vehicleNo,
    status: driver.status,
    created_at: driver.createdAt,
    updated_at: driver.updatedAt
  }
  await client.from('drivers').upsert(payload, { onConflict: 'id' })
}

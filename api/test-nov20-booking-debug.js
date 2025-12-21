import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugNov20Booking() {
  try {
    console.log('=== DEBUGGING NOVEMBER 20TH BOOKING ISSUE ===\n');
    
    // Step 1: Check current availability
    const targetDate = new Date('2025-11-20');
    targetDate.setHours(0, 0, 0, 0);
    
    console.log('1. CHECKING AVAILABILITY DATA:');
    console.log(`Target date: ${targetDate.toISOString()}`);
    
    const availability = await prisma.availability.findFirst({
      where: { 
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (availability) {
      console.log(`   ✅ Found availability record:`);
      console.log(`   Date: ${availability.date}`);
      console.log(`   Morning Available: ${availability.morningAvailable}`);
      console.log(`   Evening Available: ${availability.eveningAvailable}`);
      console.log(`   Current Bookings: ${availability.currentBookings}/${availability.maxBookings}`);
    } else {
      console.log('   ❌ No availability record found!');
    }
    
    // Step 2: Check existing bookings
    console.log('\n2. CHECKING EXISTING BOOKINGS:');
    const existingBookings = await prisma.booking.findMany({
      where: {
        pickupDate: targetDate
      }
    });
    
    console.log(`   Total bookings for Nov 20: ${existingBookings.length}`);
    existingBookings.forEach(booking => {
      console.log(`   - ${booking.pickupTime} slot: ${booking.name} (${booking.phone})`);
    });
    
    // Step 3: Check morning slot specifically
    console.log('\n3. CHECKING MORNING SLOT AVAILABILITY:');
    const morningBookings = await prisma.booking.count({
      where: {
        pickupDate: targetDate,
        pickupTime: 'morning'
      }
    });
    
    console.log(`   Morning bookings count: ${morningBookings}`);
    
    if (availability) {
      const morningAvailable = availability.morningAvailable && morningBookings < availability.maxBookings;
      console.log(`   Morning slot available: ${morningAvailable}`);
      console.log(`   - availability.morningAvailable: ${availability.morningAvailable}`);
      console.log(`   - morningBookings < maxBookings: ${morningBookings} < ${availability.maxBookings} = ${morningBookings < availability.maxBookings}`);
    }
    
    // Step 4: Simulate booking request
    console.log('\n4. SIMULATING BOOKING REQUEST:');
    const bookingRequest = {
      name: 'Test User',
      phone: '1234567890',
      email: 'test@example.com',
      pickupDate: '2025-11-20',
      pickupTime: 'morning',
      tripType: 'HOME_TO_AIRPORT',
      pickupLocation: 'Test Location',
      dropoffLocation: 'Raipur Airport'
    };
    
    console.log(`   Request data:`, JSON.stringify(bookingRequest, null, 2));
    
    // Step 5: Check what the booking route would do
    console.log('\n5. CHECKING BOOKING ROUTE LOGIC:');
    
    // This simulates the logic from bookings.js
    const requestedDate = new Date('2025-11-20');
    requestedDate.setHours(0, 0, 0, 0);
    
    console.log(`   Requested date object: ${requestedDate.toISOString()}`);
    
    // Check availability again with the exact same logic as bookings.js
    const checkAvailability = await prisma.availability.findFirst({
      where: { 
        date: {
          gte: requestedDate,
          lt: new Date(requestedDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (!checkAvailability) {
      console.log('   ❌ ERROR: No availability found - this would cause "No availability for selected date"');
    } else {
      console.log('   ✅ Availability record found');
      
      // Check slot availability
      const slotBookings = await prisma.booking.count({
        where: {
          pickupDate: requestedDate,
          pickupTime: 'morning'
        }
      });
      
      console.log(`   Morning bookings: ${slotBookings}/${checkAvailability.maxBookings}`);
      
      const slotAvailable = checkAvailability.morningAvailable && slotBookings < checkAvailability.maxBookings;
      console.log(`   Morning slot available: ${slotAvailable}`);
      
      if (!slotAvailable) {
        if (!checkAvailability.morningAvailable) {
          console.log('   ❌ REASON: morningAvailable is false');
        }
        if (slotBookings >= checkAvailability.maxBookings) {
          console.log(`   ❌ REASON: Max bookings reached (${slotBookings} >= ${checkAvailability.maxBookings})`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNov20Booking();
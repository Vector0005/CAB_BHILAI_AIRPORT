import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testBookingAndAvailability() {
  console.log('=== Testing Booking and Availability Update ===');
  
  const testDate = '2024-11-21';
  const testTime = 'morning';
  
  // Check availability before booking
  console.log('\n--- Before Booking ---');
  const beforeAvailability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date(testDate + 'T00:00:00.000Z'),
        lt: new Date(testDate + 'T23:59:59.999Z')
      }
    }
  });
  
  console.log('Before - Morning available:', beforeAvailability?.morningAvailable);
  console.log('Before - Evening available:', beforeAvailability?.eveningAvailable);
  
  // Make a booking
  console.log('\n--- Making Booking ---');
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Durg City',
    pickupDate: testDate,
    pickupTime: testTime,
    tripType: 'AIRPORT_TO_HOME',
    price: 800,
    notes: 'Test booking for availability update'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Booking successful:', result.booking.bookingNumber);
    } else {
      console.log('❌ Booking failed:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Check availability after booking
  console.log('\n--- After Booking ---');
  const afterAvailability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date(testDate + 'T00:00:00.000Z'),
        lt: new Date(testDate + 'T23:59:59.999Z')
      }
    }
  });
  
  console.log('After - Morning available:', afterAvailability?.morningAvailable);
  console.log('After - Evening available:', afterAvailability?.eveningAvailable);
  
  // Check bookings for this date
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: {
        gte: new Date(testDate + 'T00:00:00.000Z'),
        lt: new Date(testDate + 'T23:59:59.999Z')
      }
    }
  });
  
  console.log(`\n--- Bookings for ${testDate} ---`);
  console.log(`Found ${bookings.length} bookings:`);
  bookings.forEach((booking, index) => {
    console.log(`  ${index + 1}. Time: ${booking.pickupTime}, Status: ${booking.status}`);
  });
}

testBookingAndAvailability().catch(console.error).finally(() => prisma.$disconnect());
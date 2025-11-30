import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testNovember22() {
  console.log('=== Testing November 22, 2024 ===');
  
  // Check current availability for Nov 22
  const currentAvailability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-22T00:00:00.000Z'),
        lt: new Date('2024-11-22T23:59:59.999Z')
      }
    }
  });
  
  if (currentAvailability) {
    console.log('Current availability for Nov 22:');
    console.log('  Morning available:', currentAvailability.morningAvailable);
    console.log('  Evening available:', currentAvailability.eveningAvailable);
  }
  
  // Test morning booking
  console.log('\n--- Testing Morning Slot ---');
  const morningData = {
    name: 'Nov 22 Morning User',
    email: 'nov22morning@example.com',
    phone: '1111111111',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Bhilai City',
    pickupDate: '2024-11-22',
    pickupTime: 'morning',
    tripType: 'AIRPORT_TO_HOME',
    price: 850,
    notes: 'Nov 22 morning test'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(morningData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Morning booking successful:', result.booking.bookingNumber);
    } else {
      const errorText = await response.text();
      console.log('❌ Morning booking failed:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Check final availability
  console.log('\n--- Final Availability for November 22, 2024 ---');
  const finalAvailability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-22T00:00:00.000Z'),
        lt: new Date('2024-11-22T23:59:59.999Z')
      }
    }
  });
  
  if (finalAvailability) {
    console.log('Morning available:', finalAvailability.morningAvailable);
    console.log('Evening available:', finalAvailability.eveningAvailable);
  }
  
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: {
        gte: new Date('2024-11-22T00:00:00.000Z'),
        lt: new Date('2024-11-22T23:59:59.999Z')
      }
    }
  });
  
  console.log(`Total bookings for November 22: ${bookings.length}`);
}

testNovember22().catch(console.error).finally(() => prisma.$disconnect());
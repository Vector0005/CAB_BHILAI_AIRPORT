import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testEveningSlot() {
  console.log('=== Testing Evening Slot for November 21, 2024 ===');
  
  const testData = {
    name: 'Evening Test User',
    email: 'evening@example.com',
    phone: '9876543210',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Durg City',
    pickupDate: '2024-11-21',
    pickupTime: 'evening',
    tripType: 'AIRPORT_TO_HOME',
    price: 800,
    notes: 'Evening slot test'
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
      console.log('✅ Evening booking successful:', result.booking.bookingNumber);
    } else {
      const errorText = await response.text();
      console.log('❌ Evening booking failed:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  // Check final availability
  console.log('\n--- Final Availability for November 21, 2024 ---');
  const finalAvailability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-21T00:00:00.000Z'),
        lt: new Date('2024-11-21T23:59:59.999Z')
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
        gte: new Date('2024-11-21T00:00:00.000Z'),
        lt: new Date('2024-11-21T23:59:59.999Z')
      }
    }
  });
  
  console.log(`Total bookings for November 21: ${bookings.length}`);
}

testEveningSlot().catch(console.error).finally(() => prisma.$disconnect());
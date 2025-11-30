import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simpleFinalTest() {
  console.log('=== Simple Final Test ===');
  
  // Test a fresh date
  const testDate = '2024-11-26';
  
  // Create availability
  let availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date(testDate + 'T00:00:00.000Z'),
        lt: new Date(testDate + 'T23:59:59.999Z')
      }
    }
  });
  
  if (!availability) {
    availability = await prisma.availability.create({
      data: {
        date: new Date(testDate + 'T00:00:00.000Z'),
        morningAvailable: true,
        eveningAvailable: true
      }
    });
    console.log('✅ Created availability for', testDate);
  }
  
  // Test booking
  const testData = {
    name: 'Final Test User',
    email: 'final.test@example.com',
    phone: '9999999999',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Bhilai City',
    pickupDate: testDate,
    pickupTime: 'morning',
    tripType: 'AIRPORT_TO_HOME',
    price: 800
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
}

simpleFinalTest().catch(console.error).finally(() => prisma.$disconnect());
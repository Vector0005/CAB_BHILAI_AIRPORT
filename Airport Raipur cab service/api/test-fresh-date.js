import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFreshDateResponseStructure() {
  console.log('=== Testing Fresh Date Response Structure ===');
  
  // Create availability for November 24th
  let availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-24T00:00:00.000Z'),
        lt: new Date('2024-11-24T23:59:59.999Z')
      }
    }
  });
  
  if (!availability) {
    availability = await prisma.availability.create({
      data: {
        date: new Date('2024-11-24T00:00:00.000Z'),
        morningAvailable: true,
        eveningAvailable: true
      }
    });
    console.log('✅ Created availability for November 24, 2024');
  }
  
  const testData = {
    name: 'Fresh Date Test User',
    email: 'fresh.date@example.com',
    phone: '5555555555',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Bhilai City',
    pickupDate: '2024-11-24',
    pickupTime: 'morning',
    tripType: 'AIRPORT_TO_HOME',
    price: 850,
    notes: 'Fresh date test'
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    const result = await response.json();
    console.log('Response structure:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Booking successful!');
      console.log('Booking number:', result.booking.bookingNumber);
      console.log('Booking ID:', result.booking.id);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testFreshDateResponseStructure().catch(console.error).finally(() => prisma.$disconnect());
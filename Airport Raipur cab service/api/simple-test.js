import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSimpleBooking() {
  console.log('=== Testing Simple Booking ===');
  
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Durg City',
    pickupDate: '2024-11-21',
    pickupTime: 'morning',
    tripType: 'AIRPORT_TO_HOME',
    price: 800,
    notes: 'Test booking'
  };
  
  console.log('Sending booking request with data:', testData);
  
  try {
    const response = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    if (!response.ok) {
      console.log('❌ Booking failed');
      return;
    }
    
    const result = JSON.parse(responseText);
    console.log('✅ Booking successful:', result);
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testSimpleBooking().catch(console.error).finally(() => prisma.$disconnect());
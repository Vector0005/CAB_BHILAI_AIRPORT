import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testResponseStructure() {
  console.log('=== Testing Response Structure ===');
  
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Durg City',
    pickupDate: '2024-11-23',
    pickupTime: 'morning',
    tripType: 'AIRPORT_TO_HOME',
    price: 800,
    notes: 'Test response structure'
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
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testResponseStructure().catch(console.error).finally(() => prisma.$disconnect());
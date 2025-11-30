import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testEveningResponseStructure() {
  console.log('=== Testing Evening Slot Response Structure ===');
  
  const testData = {
    name: 'Test Evening User',
    email: 'test.evening@example.com',
    phone: '9876543210',
    pickupLocation: 'Raipur Airport',
    dropoffLocation: 'Durg City',
    pickupDate: '2024-11-23',
    pickupTime: 'evening',
    tripType: 'AIRPORT_TO_HOME',
    price: 800,
    notes: 'Test evening response structure'
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

testEveningResponseStructure().catch(console.error).finally(() => prisma.$disconnect());
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testBookingDebug() {
  console.log('=== Testing Booking with Debug Info ===');
  
  const testDate = '2024-11-21';
  const testTime = 'morning';
  
  console.log(`Testing booking for ${testDate} ${testTime}`);
  
  // Check availability
  const searchDate = new Date(testDate);
  searchDate.setHours(0, 0, 0, 0);
  
  console.log(`Search date: ${searchDate.toISOString()}`);
  console.log(`Next day: ${new Date(searchDate.getTime() + 24 * 60 * 60 * 1000).toISOString()}`);
  
  const availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: searchDate,
        lt: new Date(searchDate.getTime() + 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log('Availability found:', availability);
  
  if (!availability) {
    console.log('❌ No availability found');
    return;
  }
  
  console.log(`Morning available: ${availability.morningAvailable}`);
  console.log(`Evening available: ${availability.eveningAvailable}`);
  
  if (testTime === 'morning' && !availability.morningAvailable) {
    console.log('❌ Morning slot not available');
    return;
  }
  
  if (testTime === 'evening' && !availability.eveningAvailable) {
    console.log('❌ Evening slot not available');
    return;
  }
  
  console.log('✅ Availability check passed');
}

testBookingDebug().catch(console.error).finally(() => prisma.$disconnect());
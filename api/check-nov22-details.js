import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNov22Details() {
  console.log('=== Checking November 22, 2024 Details ===');
  
  const availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-22T00:00:00.000Z'),
        lt: new Date('2024-11-22T23:59:59.999Z')
      }
    }
  });
  
  if (availability) {
    console.log('Availability record:');
    console.log('  ID:', availability.id);
    console.log('  Date:', availability.date.toISOString());
    console.log('  Morning available:', availability.morningAvailable);
    console.log('  Evening available:', availability.eveningAvailable);
    console.log('  Current bookings:', availability.currentBookings);
    console.log('  Max bookings:', availability.maxBookings);
    
    // Check if there's a logic error
    const morningAvailable = availability.morningAvailable;
    const eveningAvailable = availability.eveningAvailable;
    
    console.log('\nLogic check:');
    console.log('  !morningAvailable && !eveningAvailable:', !morningAvailable && !eveningAvailable);
    console.log('  !morningAvailable:', !morningAvailable);
    console.log('  !eveningAvailable:', !eveningAvailable);
    
    let expectedStatus = 'available';
    let expectedText = '';
    
    if (!morningAvailable && !eveningAvailable) {
      expectedStatus = 'booked';
      expectedText = 'Fully Booked';
    } else if (!morningAvailable) {
      expectedStatus = 'partial';
      expectedText = 'Evening Available';
    } else if (!eveningAvailable) {
      expectedStatus = 'partial';
      expectedText = 'Morning Available';
    }
    
    console.log(`\nExpected calendar status: ${expectedStatus} (${expectedText})`);
    
  } else {
    console.log('No availability record found for November 22, 2024');
  }
  
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: {
        gte: new Date('2024-11-22T00:00:00.000Z'),
        lt: new Date('2024-11-22T23:59:59.999Z')
      }
    }
  });
  
  console.log(`\nBookings for November 22: ${bookings.length}`);
  bookings.forEach((booking, index) => {
    console.log(`  ${index + 1}. Time: ${booking.pickupTime}, Status: ${booking.status}`);
  });
}

checkNov22Details().catch(console.error).finally(() => prisma.$disconnect());
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNov23Availability() {
  console.log('=== Checking November 23, 2024 Availability ===');
  
  const availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-23T00:00:00.000Z'),
        lt: new Date('2024-11-23T23:59:59.999Z')
      }
    }
  });
  
  if (availability) {
    console.log('Availability record:');
    console.log('  Morning available:', availability.morningAvailable);
    console.log('  Evening available:', availability.eveningAvailable);
  } else {
    console.log('No availability record found');
  }
  
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: {
        gte: new Date('2024-11-23T00:00:00.000Z'),
        lt: new Date('2024-11-23T23:59:59.999Z')
      }
    }
  });
  
  console.log(`Bookings for November 23: ${bookings.length}`);
  bookings.forEach((booking, index) => {
    console.log(`  ${index + 1}. Time: ${booking.pickupTime}, Status: ${booking.status}`);
  });
}

checkNov23Availability().catch(console.error).finally(() => prisma.$disconnect());
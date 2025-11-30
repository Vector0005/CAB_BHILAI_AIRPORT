import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCurrentAvailability() {
  console.log('=== Current Availability for November 21, 2024 ===');
  
  const availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-21T00:00:00.000Z'),
        lt: new Date('2024-11-21T23:59:59.999Z')
      }
    }
  });
  
  if (availability) {
    console.log('Availability record found:');
    console.log('  ID:', availability.id);
    console.log('  Date:', availability.date.toISOString());
    console.log('  Morning available:', availability.morningAvailable);
    console.log('  Evening available:', availability.eveningAvailable);
    console.log('  Current bookings:', availability.currentBookings);
    console.log('  Max bookings:', availability.maxBookings);
  } else {
    console.log('No availability record found for November 21, 2024');
  }
  
  const bookings = await prisma.booking.findMany({
    where: {
      pickupDate: {
        gte: new Date('2024-11-21T00:00:00.000Z'),
        lt: new Date('2024-11-21T23:59:59.999Z')
      }
    }
  });
  
  console.log(`\nBookings for November 21, 2024: ${bookings.length}`);
  bookings.forEach((booking, index) => {
    console.log(`  ${index + 1}. Time: ${booking.pickupTime}, Status: ${booking.status}, Booking #: ${booking.bookingNumber}`);
  });
}

checkCurrentAvailability().catch(console.error).finally(() => prisma.$disconnect());
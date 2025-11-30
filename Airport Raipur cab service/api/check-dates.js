import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAvailability() {
  const dates = ['2024-11-21', '2024-11-22'];
  
  for (const date of dates) {
    console.log(`\n=== Checking availability for ${date} ===`);
    
    // Check all availability records for this date
    const availabilities = await prisma.availability.findMany({
      where: {
        date: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lt: new Date(date + 'T23:59:59.999Z')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${availabilities.length} availability records:`);
    availabilities.forEach((avail, index) => {
      console.log(`  ${index + 1}. Date: ${avail.date.toISOString()}, Morning: ${avail.morningAvailable}, Evening: ${avail.eveningAvailable}`);
    });
    
    // Check bookings for this date
    const bookings = await prisma.booking.findMany({
      where: {
        pickupDate: {
          gte: new Date(date + 'T00:00:00.000Z'),
          lt: new Date(date + 'T23:59:59.999Z')
        }
      }
    });
    
    console.log(`Bookings for ${date}: ${bookings.length}`);
    bookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. Time: ${booking.pickupTime}, Status: ${booking.status}`);
    });
  }
}

checkAvailability().catch(console.error).finally(() => prisma.$disconnect());
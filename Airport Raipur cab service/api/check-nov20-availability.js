import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNov20Availability() {
  try {
    // Check for November 20th, 2025
    const targetDate = new Date('2025-11-20');
    targetDate.setHours(0, 0, 0, 0);
    
    console.log('Checking availability for November 20, 2025...');
    console.log('Search date (start of day):', targetDate);
    
    // Use the same query logic as the booking system
    const availability = await prisma.availability.findFirst({
      where: { 
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (availability) {
      console.log('✅ Availability found:');
      console.log(`  Date in DB: ${availability.date}`);
      console.log(`  Morning Available: ${availability.morningAvailable}`);
      console.log(`  Evening Available: ${availability.eveningAvailable}`);
      console.log(`  Max Bookings: ${availability.maxBookings}`);
      console.log(`  Current Bookings: ${availability.currentBookings}`);
      
      // Check what the calendar sees
      const dateStr = targetDate.toISOString().split('T')[0];
      console.log(`\nCalendar date string: ${dateStr}`);
      
      // Check if there are any bookings for this date/morning slot
      const morningBookings = await prisma.booking.count({
        where: {
          pickupDate: targetDate,
          pickupTime: 'morning'
        }
      });
      
      console.log(`Morning bookings count: ${morningBookings}`);
      
      // Check total bookings for this date
      const totalBookings = await prisma.booking.count({
        where: {
          pickupDate: targetDate
        }
      });
      
      console.log(`Total bookings for this date: ${totalBookings}`);
      
    } else {
      console.log('❌ No availability found for November 20, 2025');
      
      // Check what dates are available around this time
      const nearbyAvailability = await prisma.availability.findMany({
        where: {
          date: {
            gte: new Date('2025-11-18'),
            lt: new Date('2025-11-22')
          }
        },
        orderBy: { date: 'asc' }
      });
      
      console.log('\nNearby availability:');
      nearbyAvailability.forEach(item => {
        console.log(`  ${item.date.toDateString()}: Morning=${item.morningAvailable}, Evening=${item.eveningAvailable}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNov20Availability();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActualNov20Data() {
  try {
    console.log('=== CHECKING ACTUAL NOVEMBER 20TH DATA ===\n');
    
    // Check all availability records around November 20th
    const startDate = new Date('2025-11-19');
    const endDate = new Date('2025-11-21');
    
    console.log('1. CHECKING ALL AVAILABILITY RECORDS AROUND NOV 20TH:');
    const allAvailability = await prisma.availability.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    allAvailability.forEach(item => {
      console.log(`   Date: ${item.date.toISOString()}`);
      console.log(`   Morning: ${item.morningAvailable}, Evening: ${item.eveningAvailable}`);
      console.log(`   Bookings: ${item.currentBookings}/${item.maxBookings}`);
      console.log('');
    });
    
    // Check specific November 20th
    console.log('2. CHECKING SPECIFIC NOVEMBER 20TH:');
    const nov20Start = new Date('2025-11-20');
    nov20Start.setHours(0, 0, 0, 0);
    const nov20End = new Date('2025-11-20');
    nov20End.setHours(23, 59, 59, 999);
    
    console.log(`   Search range: ${nov20Start.toISOString()} to ${nov20End.toISOString()}`);
    
    const nov20Availability = await prisma.availability.findFirst({
      where: {
        date: {
          gte: nov20Start,
          lte: nov20End
        }
      }
    });
    
    if (nov20Availability) {
      console.log(`   ✅ Found record:`);
      console.log(`   ID: ${nov20Availability.id}`);
      console.log(`   Date: ${nov20Availability.date.toISOString()}`);
      console.log(`   Morning Available: ${nov20Availability.morningAvailable}`);
      console.log(`   Evening Available: ${nov20Availability.eveningAvailable}`);
      console.log(`   Current Bookings: ${nov20Availability.currentBookings}`);
      console.log(`   Max Bookings: ${nov20Availability.maxBookings}`);
    } else {
      console.log('   ❌ No record found for November 20th');
    }
    
    // Check all bookings for November 20th
    console.log('\n3. CHECKING BOOKINGS FOR NOVEMBER 20TH:');
    const nov20Bookings = await prisma.booking.findMany({
      where: {
        pickupDate: {
          gte: nov20Start,
          lte: nov20End
        }
      }
    });
    
    console.log(`   Total bookings: ${nov20Bookings.length}`);
    nov20Bookings.forEach(booking => {
      console.log(`   - ${booking.name}: ${booking.pickupTime} slot, ${booking.status}`);
    });
    
    // Check morning slot specifically
    console.log('\n4. CHECKING MORNING SLOT BOOKINGS:');
    const morningBookings = await prisma.booking.count({
      where: {
        pickupDate: {
          gte: nov20Start,
          lte: nov20End
        },
        pickupTime: 'morning'
      }
    });
    
    console.log(`   Morning bookings: ${morningBookings}`);
    
    if (nov20Availability) {
      const morningSlotAvailable = nov20Availability.morningAvailable && morningBookings < nov20Availability.maxBookings;
      console.log(`   Morning slot available: ${morningSlotAvailable}`);
      console.log(`   - morningAvailable: ${nov20Availability.morningAvailable}`);
      console.log(`   - morningBookings < maxBookings: ${morningBookings} < ${nov20Availability.maxBookings}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualNov20Data();
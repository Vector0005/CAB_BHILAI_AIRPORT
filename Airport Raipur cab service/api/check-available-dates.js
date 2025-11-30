import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvailableDates() {
  console.log('📅 Checking available dates...');
  
  try {
    // Get all availability records
    const availability = await prisma.availability.findMany({
      orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${availability.length} availability records:`);
    
    availability.forEach((record, index) => {
      console.log(`\n${index + 1}. Date: ${record.date}`);
      console.log(`   Morning Available: ${record.morningAvailable}`);
      console.log(`   Evening Available: ${record.eveningAvailable}`);
      console.log(`   Max Bookings: ${record.maxBookings}`);
      console.log(`   Current Bookings: ${record.currentBookings}`);
    });
    
    // Find dates with availability
    const availableDates = availability.filter(record => 
      record.morningAvailable || record.eveningAvailable
    );
    
    console.log(`\n✅ Found ${availableDates.length} dates with availability:`);
    availableDates.forEach(record => {
      console.log(`   ${record.date.toISOString().split('T')[0]} - Morning: ${record.morningAvailable}, Evening: ${record.eveningAvailable}`);
    });
    
    return availableDates;
    
  } catch (error) {
    console.error('❌ Error checking availability:', error.message);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailableDates();
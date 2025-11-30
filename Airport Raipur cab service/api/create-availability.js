import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAvailability() {
  try {
    // Create availability for the next 30 days starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Create availability entry
      await prisma.availability.upsert({
        where: { 
          date: date 
        },
        update: {
          morningAvailable: true,
          eveningAvailable: true,
          maxBookings: 10,
          currentBookings: 0
        },
        create: {
          date: date,
          morningAvailable: true,
          eveningAvailable: true,
          maxBookings: 10,
          currentBookings: 0
        }
      });
      
      console.log(`Created availability for ${date.toDateString()}`);
    }
    
    console.log('✅ Availability data created successfully!');
  } catch (error) {
    console.error('Error creating availability:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAvailability();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentAvailability() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for today's and next few days
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const dateStr = checkDate.toISOString().split('T')[0];
      console.log(`\nChecking for date: ${dateStr}`);
      
      // Try different query methods
      const byRange = await prisma.availability.findFirst({
        where: { 
          date: {
            gte: checkDate,
            lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
      
      console.log(`Range query result: ${byRange ? 'FOUND' : 'NOT FOUND'}`);
      if (byRange) {
        console.log(`  Date in DB: ${byRange.date}`);
        console.log(`  Morning: ${byRange.morningAvailable}, Evening: ${byRange.eveningAvailable}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentAvailability();
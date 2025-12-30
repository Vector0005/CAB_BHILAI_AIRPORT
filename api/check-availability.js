import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvailability() {
  try {
    const availability = await prisma.availability.findMany({ 
      take: 5, 
      orderBy: { date: 'desc' } 
    });
    
    console.log('Availability data:');
    availability.forEach(item => {
      console.log(`ID: ${item.id}, Date: ${item.date}, Morning: ${item.morningAvailable}, Evening: ${item.eveningAvailable}`);
    });
    
    // Check for today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nLooking for date: ${today}`);
    const todayAvailability = await prisma.availability.findUnique({
      where: { date: today }
    });
    console.log('Today availability:', todayAvailability);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailability();
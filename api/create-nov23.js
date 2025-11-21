import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createNov23Availability() {
  console.log('=== Creating Availability for November 23, 2024 ===');
  
  try {
    const newAvailability = await prisma.availability.create({
      data: {
        date: new Date('2024-11-23T00:00:00.000Z'),
        morningAvailable: true,
        eveningAvailable: true
      }
    });
    
    console.log('✅ Created availability for November 23, 2024:');
    console.log('  Morning:', newAvailability.morningAvailable);
    console.log('  Evening:', newAvailability.eveningAvailable);
    
  } catch (error) {
    console.log('❌ Error creating availability:', error.message);
  }
  
  // Verify creation
  const availability = await prisma.availability.findFirst({
    where: { 
      date: {
        gte: new Date('2024-11-23T00:00:00.000Z'),
        lt: new Date('2024-11-23T23:59:59.999Z')
      }
    }
  });
  
  if (availability) {
    console.log('\n✅ Verified availability exists:');
    console.log('  Morning available:', availability.morningAvailable);
    console.log('  Evening available:', availability.eveningAvailable);
  }
}

createNov23Availability().catch(console.error).finally(() => prisma.$disconnect());
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllAvailability() {
  console.log('=== Checking all availability records ===');
  
  // Check availability for November 2024
  const novemberAvailabilities = await prisma.availability.findMany({
    where: {
      date: {
        gte: new Date('2024-11-01T00:00:00.000Z'),
        lt: new Date('2024-11-30T23:59:59.999Z')
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log(`Found ${novemberAvailabilities.length} availability records for November 2024:`);
  novemberAvailabilities.forEach((avail, index) => {
    console.log(`  ${index + 1}. Date: ${avail.date.toISOString().split('T')[0]}, Morning: ${avail.morningAvailable}, Evening: ${avail.eveningAvailable}`);
  });
  
  // Check specific missing dates
  const missingDates = ['2024-11-21', '2024-11-22'];
  
  for (const date of missingDates) {
    console.log(`\n=== Creating availability for ${date} ===`);
    
    try {
      const newAvailability = await prisma.availability.create({
        data: {
          date: new Date(date + 'T00:00:00.000Z'),
          morningAvailable: true,
          eveningAvailable: true
        }
      });
      
      console.log(`Created availability for ${date}: Morning: ${newAvailability.morningAvailable}, Evening: ${newAvailability.eveningAvailable}`);
    } catch (error) {
      console.log(`Error creating availability for ${date}: ${error.message}`);
    }
  }
  
  // Verify creation
  console.log('\n=== Verifying created availability ===');
  const verifiedAvailabilities = await prisma.availability.findMany({
    where: {
      date: {
        gte: new Date('2024-11-21T00:00:00.000Z'),
        lt: new Date('2024-11-23T23:59:59.999Z')
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log(`Found ${verifiedAvailabilities.length} availability records for Nov 21-22:`);
  verifiedAvailabilities.forEach((avail, index) => {
    console.log(`  ${index + 1}. Date: ${avail.date.toISOString().split('T')[0]}, Morning: ${avail.morningAvailable}, Evening: ${avail.eveningAvailable}`);
  });
}

checkAllAvailability().catch(console.error).finally(() => prisma.$disconnect());
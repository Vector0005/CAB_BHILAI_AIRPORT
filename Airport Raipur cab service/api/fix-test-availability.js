import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAvailabilityIssues() {
  console.log('🔧 Fixing availability issues...');
  
  try {
    // Fix November 21st morning availability
    const nov21 = await prisma.availability.updateMany({
      where: {
        date: {
          gte: new Date('2025-11-21T00:00:00Z'),
          lt: new Date('2025-11-22T00:00:00Z')
        }
      },
      data: {
        morningAvailable: true
      }
    });
    
    console.log(`✅ Fixed Nov 21st morning availability: ${nov21.count} records updated`);
    
    // Fix November 22nd evening availability
    const nov22 = await prisma.availability.updateMany({
      where: {
        date: {
          gte: new Date('2025-11-22T00:00:00Z'),
          lt: new Date('2025-11-23T00:00:00Z')
        }
      },
      data: {
        eveningAvailable: true
      }
    });
    
    console.log(`✅ Fixed Nov 22nd evening availability: ${nov22.count} records updated`);
    
    // Fix November 23rd morning availability
    const nov23 = await prisma.availability.updateMany({
      where: {
        date: {
          gte: new Date('2025-11-23T00:00:00Z'),
          lt: new Date('2025-11-24T00:00:00Z')
        }
      },
      data: {
        morningAvailable: true
      }
    });
    
    console.log(`✅ Fixed Nov 23rd morning availability: ${nov23.count} records updated`);
    
    // Check the updated availability
    const updatedAvailability = await prisma.availability.findMany({
      where: {
        date: {
          gte: new Date('2025-11-21T00:00:00Z'),
          lte: new Date('2025-11-23T00:00:00Z')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('\n📅 Updated availability for test dates:');
    updatedAvailability.forEach(record => {
      console.log(`   ${record.date.toISOString().split('T')[0]} - Morning: ${record.morningAvailable}, Evening: ${record.eveningAvailable}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing availability:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

fixAvailabilityIssues();
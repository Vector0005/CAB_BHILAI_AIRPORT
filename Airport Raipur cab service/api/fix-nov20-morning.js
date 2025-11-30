import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNov20MorningAvailability() {
  try {
    console.log('=== FIXING NOVEMBER 20TH MORNING AVAILABILITY ===\n');
    
    // Find the current November 20th record
    const currentRecord = await prisma.availability.findFirst({
      where: {
        date: {
          gte: new Date('2025-11-20T00:00:00.000Z'),
          lt: new Date('2025-11-21T00:00:00.000Z')
        }
      }
    });
    
    if (currentRecord) {
      console.log('Found current record:');
      console.log(`  ID: ${currentRecord.id}`);
      console.log(`  Date: ${currentRecord.date.toISOString()}`);
      console.log(`  Morning: ${currentRecord.morningAvailable}`);
      console.log(`  Evening: ${currentRecord.eveningAvailable}`);
      
      if (!currentRecord.morningAvailable) {
        console.log('\n❌ Morning is not available, updating...');
        
        // Update the record to have morning available
        const updatedRecord = await prisma.availability.update({
          where: { id: currentRecord.id },
          data: {
            morningAvailable: true
          }
        });
        
        console.log('✅ Updated record:');
        console.log(`  Morning: ${updatedRecord.morningAvailable}`);
        console.log(`  Evening: ${updatedRecord.eveningAvailable}`);
      } else {
        console.log('✅ Morning is already available');
      }
    } else {
      console.log('❌ No November 20th record found, creating one...');
      
      // Create a new record
      const newRecord = await prisma.availability.create({
        data: {
          date: new Date('2025-11-20T00:00:00.000Z'),
          morningAvailable: true,
          eveningAvailable: true,
          maxBookings: 10,
          currentBookings: 0
        }
      });
      
      console.log('✅ Created new record:');
      console.log(`  ID: ${newRecord.id}`);
      console.log(`  Morning: ${newRecord.morningAvailable}`);
      console.log(`  Evening: ${newRecord.eveningAvailable}`);
    }
    
    // Verify the fix
    console.log('\nVerifying the fix...');
    const verificationRecord = await prisma.availability.findFirst({
      where: {
        date: {
          gte: new Date('2025-11-20T00:00:00.000Z'),
          lt: new Date('2025-11-21T00:00:00.000Z')
        }
      }
    });
    
    if (verificationRecord) {
      console.log('✅ Found record:');
      console.log(`  Date: ${verificationRecord.date.toISOString()}`);
      console.log(`  Morning: ${verificationRecord.morningAvailable}`);
      console.log(`  Evening: ${verificationRecord.eveningAvailable}`);
      
      if (verificationRecord.morningAvailable) {
        console.log('✅ Morning slot is now available!');
      } else {
        console.log('❌ Morning slot is still not available');
      }
    } else {
      console.log('❌ No record found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNov20MorningAvailability();
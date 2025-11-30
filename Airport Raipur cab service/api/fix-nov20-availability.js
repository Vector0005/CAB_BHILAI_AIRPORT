import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNov20Availability() {
  try {
    console.log('=== FIXING NOVEMBER 20TH AVAILABILITY ===\n');
    
    // Find the current November 20th record
    const currentRecord = await prisma.availability.findFirst({
      where: {
        date: {
          gte: new Date('2025-11-20T18:30:00.000Z'),
          lt: new Date('2025-11-21T18:30:00.000Z')
        }
      }
    });
    
    if (currentRecord) {
      console.log('Found current record:');
      console.log(`  ID: ${currentRecord.id}`);
      console.log(`  Date: ${currentRecord.date.toISOString()}`);
      console.log(`  Morning: ${currentRecord.morningAvailable}`);
      console.log(`  Evening: ${currentRecord.eveningAvailable}`);
      
      // Update the record to have start-of-day time
      const updatedRecord = await prisma.availability.update({
        where: { id: currentRecord.id },
        data: {
          date: new Date('2025-11-20T00:00:00.000Z') // Start of day in local time
        }
      });
      
      console.log('\n✅ Updated record to start of day:');
      console.log(`  New date: ${updatedRecord.date.toISOString()}`);
    } else {
      console.log('❌ No November 20th record found');
      
      // Create a new record if none exists
      console.log('Creating new November 20th record...');
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
      console.log(`  Date: ${newRecord.date.toISOString()}`);
    }
    
    // Verify the fix
    console.log('\nVerifying the fix...');
    const verificationDate = new Date('2025-11-20');
    verificationDate.setHours(0, 0, 0, 0);
    
    const verificationRecord = await prisma.availability.findFirst({
      where: {
        date: {
          gte: verificationDate,
          lt: new Date(verificationDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });
    
    if (verificationRecord) {
      console.log('✅ Found record with correct date range:');
      console.log(`  Date: ${verificationRecord.date.toISOString()}`);
      console.log(`  Morning: ${verificationRecord.morningAvailable}`);
      console.log(`  Evening: ${verificationRecord.eveningAvailable}`);
    } else {
      console.log('❌ Still no record found in the correct date range');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNov20Availability();
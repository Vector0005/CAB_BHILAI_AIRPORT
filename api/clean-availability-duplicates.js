import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateAvailability() {
  try {
    console.log('=== CLEANING DUPLICATE AVAILABILITY RECORDS ===\n');
    
    // Get all availability records
    const allRecords = await prisma.availability.findMany({
      orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${allRecords.length} total availability records`);
    
    // Group by date (ignoring time)
    const groupedByDate = {};
    allRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0]; // Get YYYY-MM-DD
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = [];
      }
      groupedByDate[dateStr].push(record);
    });
    
    console.log('\nGrouped by date:');
    Object.keys(groupedByDate).forEach(date => {
      console.log(`  ${date}: ${groupedByDate[date].length} records`);
      groupedByDate[date].forEach((record, index) => {
        console.log(`    [${index}] ${record.date.toISOString()} - Morning: ${record.morningAvailable}, Evening: ${record.eveningAvailable}`);
      });
    });
    
    // Find dates with multiple records
    const duplicateDates = Object.keys(groupedByDate).filter(date => groupedByDate[date].length > 1);
    
    console.log(`\nFound ${duplicateDates.length} dates with duplicate records`);
    
    if (duplicateDates.length === 0) {
      console.log('✅ No duplicate records found!');
      return;
    }
    
    // For each duplicate date, keep the one with morning=true if available, otherwise the first one
    for (const date of duplicateDates) {
      const records = groupedByDate[date];
      console.log(`\nProcessing ${date} with ${records.length} records:`);
      
      // Find the best record (morning=true preferred)
      let bestRecord = records[0];
      let bestRecordIndex = 0;
      
      for (let i = 1; i < records.length; i++) {
        if (records[i].morningAvailable && !bestRecord.morningAvailable) {
          bestRecord = records[i];
          bestRecordIndex = i;
        }
      }
      
      console.log(`  Keeping record [${bestRecordIndex}]: ${bestRecord.date.toISOString()}`);
      console.log(`  Morning: ${bestRecord.morningAvailable}, Evening: ${bestRecord.eveningAvailable}`);
      
      // Delete all other records for this date
      const recordsToDelete = records.filter((_, index) => index !== bestRecordIndex);
      
      for (const recordToDelete of recordsToDelete) {
        console.log(`  Deleting record: ${recordToDelete.date.toISOString()}`);
        await prisma.availability.delete({
          where: { id: recordToDelete.id }
        });
      }
      
      console.log(`  Deleted ${recordsToDelete.length} records for ${date}`);
    }
    
    console.log('\n✅ Cleanup completed!');
    
    // Verify the cleanup
    console.log('\nVerifying cleanup...');
    const remainingRecords = await prisma.availability.findMany({
      orderBy: { date: 'asc' }
    });
    
    console.log(`Remaining records: ${remainingRecords.length}`);
    
    const groupedAfter = {};
    remainingRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!groupedAfter[dateStr]) {
        groupedAfter[dateStr] = 0;
      }
      groupedAfter[dateStr]++;
    });
    
    const stillDuplicates = Object.keys(groupedAfter).filter(date => groupedAfter[date] > 1);
    
    if (stillDuplicates.length === 0) {
      console.log('✅ No duplicate records remaining!');
    } else {
      console.log(`⚠️  Still have duplicates for dates: ${stillDuplicates.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateAvailability();
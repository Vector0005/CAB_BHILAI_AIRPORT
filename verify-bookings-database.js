import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBookingsInDatabase() {
  console.log('🔍 Verifying bookings in database...');
  
  try {
    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: true
      }
    });
    
    console.log(`📊 Found ${recentBookings.length} recent bookings:`);
    
    recentBookings.forEach((booking, index) => {
      console.log(`\n${index + 1}. Booking #${booking.bookingNumber}`);
      console.log(`   Date: ${booking.date}`);
      console.log(`   Time: ${booking.time}`);
      console.log(`   Trip Type: ${booking.tripType}`);
      console.log(`   From: ${booking.fromLocation}`);
      console.log(`   To: ${booking.toLocation}`);
      console.log(`   Customer: ${booking.name} (${booking.email})`);
      console.log(`   Phone: ${booking.phone}`);
      console.log(`   Vehicle: ${booking.vehicleType}`);
      console.log(`   Price: ₹${booking.price}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Created: ${booking.createdAt}`);
      if (booking.user) {
        console.log(`   User ID: ${booking.user.id} (${booking.user.email})`);
      }
    });
    
    // Check for the specific test booking we made
    const testBooking = await prisma.booking.findFirst({
      where: {
        date: '2024-11-20',
        time: 'morning',
        name: 'Test User'
      },
      include: {
        user: true
      }
    });
    
    if (testBooking) {
      console.log('\n✅ Test booking found in database:');
      console.log(`   Booking Number: ${testBooking.bookingNumber}`);
      console.log(`   Date: ${testBooking.date}`);
      console.log(`   Time: ${testBooking.time}`);
      console.log(`   Status: ${testBooking.status}`);
      console.log(`   Price: ₹${testBooking.price}`);
    } else {
      console.log('\n⚠️  Test booking not found in database');
    }
    
    // Check total booking count
    const totalBookings = await prisma.booking.count();
    console.log(`\n📈 Total bookings in database: ${totalBookings}`);
    
    return {
      success: true,
      recentBookings: recentBookings,
      testBooking: testBooking,
      totalBookings: totalBookings
    };
    
  } catch (error) {
    console.error('❌ Error verifying bookings:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyBookingsInDatabase()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Database verification completed successfully!');
    } else {
      console.log('\n❌ Database verification failed:', result.error);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error.message);
  });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function comprehensiveSystemTest() {
  console.log('=== Comprehensive System Test ===');
  
  // Test different scenarios
  const testScenarios = [
    {
      name: 'Morning Airport to Home',
      data: {
        name: 'Morning User',
        email: 'morning@test.com',
        phone: '1111111111',
        pickupLocation: 'Raipur Airport',
        dropoffLocation: 'Bhilai City',
        pickupDate: '2024-11-27',
        pickupTime: 'morning',
        tripType: 'AIRPORT_TO_HOME',
        price: 800
      }
    },
    {
      name: 'Evening Home to Airport', 
      data: {
        name: 'Evening User',
        email: 'evening@test.com',
        phone: '2222222222',
        pickupLocation: 'Durg City',
        dropoffLocation: 'Raipur Airport',
        pickupDate: '2024-11-27',
        pickupTime: 'evening',
        tripType: 'HOME_TO_AIRPORT',
        price: 750
      }
    }
  ];
  
  let successCount = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    
    try {
      // Create availability if not exists
      const availability = await prisma.availability.findFirst({
        where: {
          date: {
            gte: new Date(scenario.data.pickupDate + 'T00:00:00.000Z'),
            lt: new Date(scenario.data.pickupDate + 'T23:59:59.999Z')
          }
        }
      });
      
      if (!availability) {
        await prisma.availability.create({
          data: {
            date: new Date(scenario.data.pickupDate + 'T00:00:00.000Z'),
            morningAvailable: true,
            eveningAvailable: true
          }
        });
        console.log('✅ Created availability for', scenario.data.pickupDate);
      }
      
      // Test booking
      const response = await fetch('http://localhost:3001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario.data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Booking failed: ${errorData.error || errorData.message}`);
      }
      
      const result = await response.json();
      console.log(`✅ Booking successful: ${result.booking.bookingNumber}`);
      
      // Verify booking data
      const booking = result.booking;
      console.log(`   Name: ${booking.name}`);
      console.log(`   Date: ${booking.pickupDate.split('T')[0]}`);
      console.log(`   Time: ${booking.pickupTime}`);
      console.log(`   From: ${booking.pickupLocation} → ${booking.dropoffLocation}`);
      console.log(`   Price: ₹${booking.price}`);
      
      successCount++;
      
    } catch (error) {
      console.log(`❌ ${scenario.name} failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Successful: ${successCount}/${testScenarios.length}`);
  
  if (successCount === testScenarios.length) {
    console.log('🎉 All tests passed! The booking system is working correctly.');
    
    // Check final availability status
    console.log('\n🔍 Final Availability Status:');
    const finalAvailability = await prisma.availability.findFirst({
      where: {
        date: {
          gte: new Date('2024-11-27T00:00:00.000Z'),
          lt: new Date('2024-11-27T23:59:59.999Z')
        }
      }
    });
    
    if (finalAvailability) {
      console.log(`   Morning: ${finalAvailability.morningAvailable ? '✅ Available' : '❌ Booked'}`);
      console.log(`   Evening: ${finalAvailability.eveningAvailable ? '✅ Available' : '❌ Booked'}`);
      
      const calendarColor = !finalAvailability.morningAvailable && !finalAvailability.eveningAvailable ? 'RED (Fully Booked)' :
                           !finalAvailability.morningAvailable || !finalAvailability.eveningAvailable ? 'ORANGE (Partially Booked)' : 'GREEN (Fully Available)';
      console.log(`   Calendar: ${calendarColor}`);
    }
    
    const bookings = await prisma.booking.findMany({
      where: {
        pickupDate: {
          gte: new Date('2024-11-27T00:00:00.000Z'),
          lt: new Date('2024-11-27T23:59:59.999Z')
        }
      }
    });
    
    console.log(`   Total bookings: ${bookings.length}`);
    
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
}

comprehensiveSystemTest().catch(console.error).finally(() => prisma.$disconnect());
// Test different booking scenarios with correct availability
async function testScenariosCorrected() {
  console.log('🧪 Testing Different Booking Scenarios with Corrected Availability...');
  
  const scenarios = [
    {
      name: 'Airport to Home Booking - Evening',
      data: {
        name: 'Airport User',
        email: 'airport@example.com',
        phone: '2222222222',
        pickupLocation: 'Raipur Airport',
        dropoffLocation: 'Bhilai Sector 5',
        pickupDate: '2025-11-21',
        pickupTime: 'evening',
        tripType: 'AIRPORT_TO_HOME',
        vehicleType: 'sedan',
        price: 900
      }
    },
    {
      name: 'Evening Slot Booking',
      data: {
        name: 'Evening User',
        email: 'evening@example.com',
        phone: '3333333333',
        pickupLocation: 'City Mall',
        dropoffLocation: 'Raipur Airport',
        pickupDate: '2025-11-22',
        pickupTime: 'evening',
        tripType: 'HOME_TO_AIRPORT',
        vehicleType: 'tempo',
        price: 1200
      }
    },
    {
      name: 'Tempo Vehicle Booking - Morning',
      data: {
        name: 'Tempo User',
        email: 'tempo@example.com',
        phone: '4444444444',
        pickupLocation: 'Durg',
        dropoffLocation: 'Raipur Airport',
        pickupDate: '2025-11-23',
        pickupTime: 'morning',
        tripType: 'HOME_TO_AIRPORT',
        vehicleType: 'tempo',
        price: 1500
      }
    }
  ];
  
  let successCount = 0;
  
  for (const scenario of scenarios) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    
    try {
      // Test booking creation
      const bookingResponse = await fetch('http://localhost:3001/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario.data)
      });
      
      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        throw new Error(`Booking failed: ${errorData.error}`);
      }
      
      const bookingResult = await bookingResponse.json();
      console.log(`✅ Booking successful: ${bookingResult.bookingNumber}`);
      
      // Verify booking data
      assert(bookingResult.bookingNumber, 'Booking number should be present');
      assert(bookingResult.name === scenario.data.name, 'Name should match');
      assert(bookingResult.email === scenario.data.email, 'Email should match');
      assert(bookingResult.phone === scenario.data.phone, 'Phone should match');
      assert(bookingResult.pickupLocation === scenario.data.pickupLocation, 'Pickup location should match');
      assert(bookingResult.dropoffLocation === scenario.data.dropoffLocation, 'Dropoff location should match');
      assert(bookingResult.pickupTime === scenario.data.pickupTime, 'Pickup time should match');
      assert(bookingResult.tripType === scenario.data.tripType, 'Trip type should match');
      assert(bookingResult.price === scenario.data.price, 'Price should match');
      
      successCount++;
      console.log(`✅ All validations passed for ${scenario.name}`);
      
    } catch (error) {
      console.error(`❌ ${scenario.name} failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Scenario Test Results:`);
  console.log(`✅ Successful: ${successCount}/${scenarios.length}`);
  console.log(`❌ Failed: ${scenarios.length - successCount}/${scenarios.length}`);
  
  return {
    success: successCount === scenarios.length,
    message: `Completed ${successCount}/${scenarios.length} booking scenarios successfully`,
    successCount,
    totalCount: scenarios.length
  };
}

// Run the corrected test
testScenariosCorrected();
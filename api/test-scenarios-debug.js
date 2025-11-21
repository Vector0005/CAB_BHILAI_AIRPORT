// Test different booking scenarios with detailed error reporting
async function testDifferentScenariosDebug() {
  console.log('🧪 Testing Different Booking Scenarios with Debug...');
  
  const scenarios = [
    {
      name: 'Airport to Home Booking',
      data: {
        name: 'Airport User',
        email: 'airport@example.com',
        phone: '2222222222',
        pickupLocation: 'Raipur Airport',
        dropoffLocation: 'Bhilai Sector 5',
        pickupDate: '2024-11-22',
        pickupTime: 'morning',
        tripType: 'AIRPORT_TO_HOME',
        vehicleType: 'sedan',
        price: 900
      }
    }
  ];
  
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
      
      console.log(`Response status: ${bookingResponse.status}`);
      console.log(`Response headers: ${JSON.stringify([...bookingResponse.headers])}`);
      
      const responseText = await bookingResponse.text();
      console.log(`Response text: ${responseText}`);
      
      if (!bookingResponse.ok) {
        throw new Error(`Booking failed with status ${bookingResponse.status}`);
      }
      
      const bookingResult = JSON.parse(responseText);
      console.log(`✅ Booking successful: ${bookingResult.bookingNumber}`);
      
    } catch (error) {
      console.error(`❌ ${scenario.name} failed: ${error.message}`);
    }
  }
}

// Run the debug test
testDifferentScenariosDebug();
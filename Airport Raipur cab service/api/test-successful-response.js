// Test the successful scenario to see what it returns
async function testSuccessfulScenario() {
  console.log('🧪 Testing Successful Scenario to See Response...');
  
  const scenario = {
    name: 'Home to Airport - Evening',
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
  };
  
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
    
    const responseText = await bookingResponse.text();
    console.log(`Response text: ${responseText}`);
    
    if (!bookingResponse.ok) {
      throw new Error(`Booking failed with status ${bookingResponse.status}`);
    }
    
    const bookingResult = JSON.parse(responseText);
    console.log(`✅ Booking result object:`, JSON.stringify(bookingResult, null, 2));
    
  } catch (error) {
    console.error(`❌ ${scenario.name} failed: ${error.message}`);
  }
}

// Run the test
testSuccessfulScenario();
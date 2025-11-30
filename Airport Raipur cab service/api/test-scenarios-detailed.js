// Test different booking scenarios with detailed debug
async function testScenariosDebug() {
  console.log('🧪 Testing Different Booking Scenarios with Debug...');
  
  const scenario = {
    name: 'Airport to Home Booking',
    data: {
      name: 'Airport User',
      email: 'airport@example.com',
      phone: '2222222222',
      pickupLocation: 'Raipur Airport',
      dropoffLocation: 'Bhilai Sector 5',
      pickupDate: '2025-11-21',
      pickupTime: 'morning',
      tripType: 'AIRPORT_TO_HOME',
      vehicleType: 'sedan',
      price: 900
    }
  };
  
  console.log(`\n📝 Testing: ${scenario.name}`);
  console.log('Request data:', JSON.stringify(scenario.data, null, 2));
  
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
    console.log(`Response status text: ${bookingResponse.statusText}`);
    
    const responseText = await bookingResponse.text();
    console.log(`Response text: ${responseText}`);
    
    if (!bookingResponse.ok) {
      throw new Error(`Booking failed with status ${bookingResponse.status}`);
    }
    
    const bookingResult = JSON.parse(responseText);
    console.log(`✅ Booking result:`, bookingResult);
    
  } catch (error) {
    console.error(`❌ ${scenario.name} failed: ${error.message}`);
  }
}

// Run the debug test
testScenariosDebug();
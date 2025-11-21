const http = require('http');

// Test with missing price (simulating frontend issue)
const bookingDataNoPrice = {
  name: 'Test User No Price',
  phone: '1234567890',
  email: 'test@example.com',
  pickupDate: '2025-11-20',
  pickupTime: 'morning',
  tripType: 'HOME_TO_AIRPORT',
  pickupLocation: 'Test Location',
  dropoffLocation: 'Raipur Airport'
  // Missing price field
};

// Test with zero price
const bookingDataZeroPrice = {
  name: 'Test User Zero Price',
  phone: '1234567890',
  email: 'test@example.com',
  pickupDate: '2025-11-20',
  pickupTime: 'morning',
  tripType: 'HOME_TO_AIRPORT',
  pickupLocation: 'Test Location',
  dropoffLocation: 'Raipur Airport',
  price: 0
};

function testBooking(bookingData, testName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bookingData);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`\n🧪 ${testName}`);
    console.log('📤 Request data:', JSON.stringify(bookingData, null, 2));
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📥 Response status: ${res.statusCode}`);
        console.log(`📄 Response data: ${data}`);
        
        if (res.statusCode === 201) {
          console.log('✅ BOOKING SUCCESSFUL!');
          resolve(true);
        } else {
          console.log('❌ BOOKING FAILED');
          try {
            const errorData = JSON.parse(data);
            console.log('Error details:', errorData);
            resolve(false);
          } catch (e) {
            console.log('Raw error response:', data);
            resolve(false);
          }
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 TESTING DIFFERENT PRICE SCENARIOS FOR NOV 20TH MORNING BOOKING');
  
  await testBooking(bookingDataNoPrice, 'TEST 1: Missing Price Field');
  await testBooking(bookingDataZeroPrice, 'TEST 2: Zero Price');
  
  console.log('\n✅ All tests completed!');
}

runTests();
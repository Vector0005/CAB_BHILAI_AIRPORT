// Test booking for November 20th morning slot with debug
const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testNov20MorningBooking() {
  console.log('🧪 Testing November 20th morning slot booking...\n');

  // Step 1: Check availability for Nov 20th
  console.log('📅 Step 1: Checking availability for November 20th...');
  const availabilityResult = await makeRequest('GET', '/availability');
  
  if (availabilityResult.status === 200) {
    const nov20Availability = availabilityResult.data.find(item => {
      const itemDate = new Date(item.date);
      return itemDate.getDate() === 20 && itemDate.getMonth() === 10; // November is month 10
    });
    
    if (nov20Availability) {
      console.log('✅ November 20th availability found:');
      console.log(`  Morning: ${nov20Availability.morningAvailable}`);
      console.log(`  Evening: ${nov20Availability.eveningAvailable}`);
    } else {
      console.log('❌ November 20th availability not found in API response');
    }
  }

  // Step 2: Try to book for Nov 20th morning
  console.log('\n📝 Step 2: Attempting to book November 20th morning slot...');
  
  const bookingData = {
    name: 'Nov 20 Morning Test',
    phone: '1111111111',
    email: 'nov20@test.com',
    pickupDate: '2025-11-20',
    pickupTime: 'morning',
    tripType: 'HOME_TO_AIRPORT',
    pickupLocation: 'Test Location, Bhilai',
    dropoffLocation: 'Raipur Airport',
    price: 500
  };

  console.log('Booking data being sent:', JSON.stringify(bookingData, null, 2));
  
  const bookingResult = await makeRequest('POST', '/bookings', bookingData);
  console.log(`\nBooking Status: ${bookingResult.status}`);
  
  if (bookingResult.status === 201) {
    console.log('✅ Booking successful!');
    console.log(`Booking Number: ${bookingResult.data.booking.bookingNumber}`);
  } else {
    console.log('❌ Booking failed!');
    console.log('Error response:', JSON.stringify(bookingResult.data, null, 2));
  }

  // Step 3: Check what the booking route sees
  console.log('\n🔍 Step 3: Checking what the booking route receives...');
  console.log('Pickup date sent: 2025-11-20');
  console.log('Pickup time sent: morning');
}

testNov20MorningBooking();
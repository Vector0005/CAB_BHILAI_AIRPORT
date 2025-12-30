const http = require('http');

// Test the exact date format issue
console.log('🕐 Testing date format compatibility...');

// First, let's see what dates are available and their exact format
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/availability',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const availability = JSON.parse(data);
    
    console.log('\n📅 Available dates analysis:');
    availability.slice(0, 3).forEach(item => {
      const dbDate = new Date(item.date);
      const dateStr = dbDate.toISOString().split('T')[0];
      console.log(`DB Date: ${item.date}`);
      console.log(`Extracted: ${dateStr}`);
      console.log(`Morning: ${item.morningAvailable}, Evening: ${item.eveningAvailable}`);
      console.log('---');
    });
    
    // Try with the first available date
    const firstAvailable = availability.find(item => item.morningAvailable === true);
    if (firstAvailable) {
      const testDate = new Date(firstAvailable.date).toISOString().split('T')[0];
      console.log(`\n🎯 Testing with: ${testDate}`);
      
      // Test booking
      testBooking(testDate);
    }
  });
});

function testBooking(date) {
  const postData = JSON.stringify({
    name: 'Test Customer Debug',
    phone: '9876543210',
    email: 'test@example.com',
    pickupDate: date,
    pickupTime: 'morning',
    tripType: 'HOME_TO_AIRPORT',
    pickupLocation: 'Test Location, Bhilai',
    dropoffLocation: 'Raipur Airport',
    price: 500
  });

  console.log('📤 Sending booking request...');
  console.log('Pickup date in request:', date);

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

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Booking Status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ SUCCESS! Booking created!');
        verifyBookingCreated();
      } else {
        console.log('❌ Failed again');
        
        // Let's try a different approach - check if we need to create availability
        console.log('\n🔍 Let\'s check if we need to create availability for this date...');
      }
    });
  });

  req.write(postData);
  req.end();
}

function verifyBookingCreated() {
  console.log('\n🔍 Verifying booking was created...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/bookings?limit=1',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const bookings = JSON.parse(data).bookings;
        if (bookings.length > 0) {
          const latest = bookings[0];
          console.log('Latest booking:');
          console.log(`- Booking #: ${latest.bookingNumber}`);
          console.log(`- Customer: ${latest.name}`);
          console.log(`- Date: ${latest.pickupDate}`);
          console.log(`- Status: ${latest.status}`);
          console.log('✅ Booking verified!');
        }
      }
    });
  });

  req.end();
}

req.end();
const http = require('http');

// First, get availability to see the exact date format
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
    console.log('Raw availability data:');
    console.log(JSON.stringify(availability.slice(0, 3), null, 2));
    
    // Find first available morning slot
    const firstAvailable = availability.find(item => item.morningAvailable === true);
    if (firstAvailable) {
      console.log('\nFirst available item:');
      console.log('Date from DB:', firstAvailable.date);
      console.log('Morning available:', firstAvailable.morningAvailable);
      
      // Extract just the date part (YYYY-MM-DD)
      const availableDate = firstAvailable.date.split('T')[0];
      console.log('Extracted date:', availableDate);
      
      // Test booking with this exact date
      testBooking(availableDate);
    }
  });
});

function testBooking(date) {
  console.log(`\n📝 Testing booking with date: ${date}`);
  
  const postData = JSON.stringify({
    name: 'Test Customer',
    phone: '9876543210',
    email: 'test@example.com',
    pickupDate: date,
    pickupTime: 'morning',
    tripType: 'HOME_TO_AIRPORT',
    pickupLocation: 'Test Location, Bhilai',
    dropoffLocation: 'Raipur Airport',
    price: 500
  });

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
      console.log('Booking Response:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ Booking created successfully!');
        // Verify booking appears in database
        verifyBooking();
      } else {
        console.log('❌ Booking failed');
      }
    });
  });

  req.write(postData);
  req.end();
}

function verifyBooking() {
  console.log('\n🔍 Verifying booking in database...');
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
      const bookings = JSON.parse(data).bookings;
      if (bookings.length > 0) {
        const latest = bookings[0];
        console.log('Latest booking:');
        console.log(`- Booking #: ${latest.bookingNumber}`);
        console.log(`- Customer: ${latest.name}`);
        console.log(`- Date: ${latest.pickupDate}`);
        console.log(`- Status: ${latest.status}`);
        console.log('✅ Booking verified in database!');
      }
    });
  });

  req.end();
}

req.end();
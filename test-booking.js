const http = require('http');

// Test booking data
const postData = JSON.stringify({
  name: 'Test Customer',
  phone: '9876543210',
  email: 'test@example.com',
  pickupDate: '2024-11-25',
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
      // Now let's check if it appears in the database
      checkRecentBookings();
    } else {
      console.log('❌ Booking failed');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

function checkRecentBookings() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/bookings',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('\n📋 Recent Bookings:');
      const bookings = JSON.parse(data).bookings;
      bookings.slice(0, 3).forEach(booking => {
        console.log(`- ${booking.bookingNumber}: ${booking.name} - ${booking.pickupDate} - ${booking.status}`);
      });
    });
  });

  req.end();
}

req.write(postData);
req.end();
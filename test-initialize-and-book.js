const http = require('http');

// Initialize availability for the next 90 days
const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/availability/initialize',
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
    console.log('Availability initialization status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Availability initialized!');
      // Now test booking
      testBooking();
    } else {
      console.log('❌ Failed to initialize availability');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

function testBooking() {
  console.log('\n📝 Testing booking with tomorrow\'s date...');
  
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const postData = JSON.stringify({
    name: 'Test Customer Final',
    phone: '9876543210',
    email: 'test@example.com',
    pickupDate: tomorrowStr,
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
        const bookingResult = JSON.parse(data);
        console.log(`Booking Number: ${bookingResult.booking.bookingNumber}`);
        verifyBooking(bookingResult.booking.bookingNumber);
      } else {
        console.log('❌ Booking failed');
      }
    });
  });

  req.write(postData);
  req.end();
}

function verifyBooking(bookingNumber) {
  console.log('\n🔍 Verifying booking in admin panel...');
  
  // First, login as admin
  const loginData = JSON.stringify({
    email: 'admin@raipurtaxi.com',
    password: 'admin123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const loginReq = http.request(loginOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const token = JSON.parse(data).token;
        console.log('✅ Admin login successful');
        
        // Get admin bookings
        const bookingsOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/admin/bookings?limit=5',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const bookingsReq = http.request(bookingsOptions, (res) => {
          let bookingsData = '';
          res.on('data', (chunk) => {
            bookingsData += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              const bookings = JSON.parse(bookingsData).bookings;
              const foundBooking = bookings.find(b => b.bookingNumber === bookingNumber);
              
              if (foundBooking) {
                console.log('✅ Booking found in admin panel!');
                console.log(`Customer: ${foundBooking.name}`);
                console.log(`Date: ${foundBooking.pickupDate}`);
                console.log(`Status: ${foundBooking.status}`);
                console.log(`Trip: ${foundBooking.tripType}`);
              } else {
                console.log('❌ Booking not found in admin panel');
                console.log('Available bookings:');
                bookings.forEach(b => {
                  console.log(`- ${b.bookingNumber}: ${b.name} - ${b.pickupDate}`);
                });
              }
              
              console.log(`\n📊 Total bookings in admin panel: ${bookings.length}`);
            }
          });
        });

        bookingsReq.end();
      }
    });
  });

  loginReq.write(loginData);
  loginReq.end();
}

req.write(postData);
req.end();
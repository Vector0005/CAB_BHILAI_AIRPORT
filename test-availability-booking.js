const http = require('http');

// Create availability for a specific date
function createAvailability(date) {
  const postData = JSON.stringify({
    date: date,
    morningAvailable: true,
    eveningAvailable: true,
    maxBookings: 10
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/availability',
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
      console.log(`Availability creation for ${date}:`);
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201) {
        console.log(`✅ Availability created for ${date}`);
        // Now test booking
        testBooking(date);
      } else {
        console.log(`❌ Failed to create availability for ${date}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
  });

  req.write(postData);
  req.end();
}

function testBooking(date) {
  console.log(`\n📝 Testing booking for ${date}...`);
  
  const postData = JSON.stringify({
    name: 'Test Customer Final',
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
      console.log('Response:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ Booking created successfully!');
        const bookingResult = JSON.parse(data);
        console.log(`Booking Number: ${bookingResult.booking.bookingNumber}`);
        verifyBookingInAdmin(bookingResult.booking.bookingNumber);
      } else {
        console.log('❌ Booking failed');
      }
    });
  });

  req.write(postData);
  req.end();
}

function verifyBookingInAdmin(bookingNumber) {
  console.log('\n🔐 Verifying booking appears in admin panel...');
  
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
          path: '/api/admin/bookings',
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
              } else {
                console.log('❌ Booking not found in admin panel');
              }
              
              console.log(`\n📊 Total bookings in system: ${bookings.length}`);
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

// Test with tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

console.log('🎯 Creating availability and testing booking...');
createAvailability(tomorrowStr);
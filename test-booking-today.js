const http = require('http');

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];
console.log('Testing with today\'s date:', today);

// Test booking with today's date
const postData = JSON.stringify({
  name: 'Test Customer Today',
  phone: '9876543210',
  email: 'test@example.com',
  pickupDate: today,
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
      // Verify booking appears in admin panel
      verifyInAdminPanel();
    } else {
      console.log('❌ Booking failed');
      // Let's try to create availability for today
      createAvailabilityForToday();
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

function verifyInAdminPanel() {
  console.log('\n🔍 Checking if booking appears in admin panel...');
  
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
        
        // Get recent bookings
        const bookingsOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/admin/bookings?limit=3',
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
            console.log('Admin bookings status:', res.statusCode);
            if (res.statusCode === 200) {
              const bookings = JSON.parse(bookingsData).bookings;
              console.log('Recent bookings from admin panel:');
              bookings.forEach(booking => {
                console.log(`- ${booking.bookingNumber}: ${booking.name} - ${booking.pickupDate} - ${booking.status}`);
              });
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

function createAvailabilityForToday() {
  console.log('\n📝 Creating availability for today...');
  
  const todayData = JSON.stringify({
    date: today,
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
      'Content-Length': Buffer.byteLength(todayData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Availability creation status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ Availability created for today!');
        // Now try booking again
        console.log('\n🔄 Retrying booking...');
        setTimeout(() => {
          require('child_process').execSync('node test-booking-today.js', { stdio: 'inherit' });
        }, 1000);
      }
    });
  });

  req.write(todayData);
  req.end();
}

req.write(postData);
req.end();
const http = require('http');

// Use a date from the available dates (2025)
const availableDate = '2025-11-19'; // This is available from our test

console.log('Testing with available date:', availableDate);

// Test booking with the available date
const postData = JSON.stringify({
  name: 'Test Customer Working',
  phone: '9876543210',
  email: 'test@example.com',
  pickupDate: availableDate,
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
      verifyBooking();
      testAdminPanel();
    } else {
      console.log('❌ Booking failed');
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

function verifyBooking() {
  console.log('\n🔍 Verifying booking in database...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/bookings?limit=3',
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
        console.log('Recent bookings:');
        bookings.forEach(booking => {
          console.log(`- ${booking.bookingNumber}: ${booking.name} - ${booking.pickupDate} - ${booking.status}`);
        });
        
        // Check if our booking is there
        const ourBooking = bookings.find(b => b.name === 'Test Customer Working');
        if (ourBooking) {
          console.log('\n✅ Our booking is confirmed in the system!');
          console.log(`Booking Number: ${ourBooking.bookingNumber}`);
          console.log(`Date: ${ourBooking.pickupDate}`);
          console.log(`Status: ${ourBooking.status}`);
        }
      }
    });
  });

  req.end();
}

function testAdminPanel() {
  console.log('\n🔐 Testing admin panel integration...');
  
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
        
        // Get admin dashboard data
        const dashboardOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/admin/dashboard',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const dashboardReq = http.request(dashboardOptions, (res) => {
          let dashboardData = '';
          res.on('data', (chunk) => {
            dashboardData += chunk;
          });
          res.on('end', () => {
            console.log('Admin dashboard status:', res.statusCode);
            if (res.statusCode === 200) {
              const dashboard = JSON.parse(dashboardData);
              console.log('Dashboard stats:');
              console.log(`- Total bookings: ${dashboard.statistics.totalBookings}`);
              console.log(`- Pending bookings: ${dashboard.statistics.pendingBookings}`);
              console.log(`- Today bookings: ${dashboard.statistics.todayBookings}`);
              console.log(`- Recent bookings: ${dashboard.recentBookings.length}`);
              
              // Check if our new booking appears
              const ourBooking = dashboard.recentBookings.find(b => b.name === 'Test Customer Working');
              if (ourBooking) {
                console.log('\n✅ Our booking appears in admin dashboard!');
              } else {
                console.log('\nℹ️  Our booking may not be in recent bookings (limited to 5)');
              }
            }
          });
        });

        dashboardReq.end();
      }
    });
  });

  loginReq.write(loginData);
  loginReq.end();
}

req.write(postData);
req.end();
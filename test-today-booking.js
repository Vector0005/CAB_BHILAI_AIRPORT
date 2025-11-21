const http = require('http');

// Get the exact current date
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

console.log('Current date:', today.toISOString());
console.log('Date string for booking:', todayStr);

// First, check if availability exists for today
const checkOptions = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/availability/${todayStr}`,
  method: 'GET'
};

const checkReq = http.request(checkOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Availability check status:', res.statusCode);
    if (res.statusCode === 200) {
      const availability = JSON.parse(data);
      console.log('Availability for today:', availability);
      
      if (availability.morningAvailable) {
        console.log('✅ Morning slot is available!');
        testBooking(todayStr);
      } else {
        console.log('❌ Morning slot not available');
      }
    } else {
      console.log('❌ No availability found for today');
      console.log('Response:', data);
    }
  });
});

checkReq.end();

function testBooking(date) {
  console.log(`\n📝 Testing booking for ${date}...`);
  
  const postData = JSON.stringify({
    name: 'Test Customer Today',
    phone: '9876543210',
    email: 'test@example.com',
    pickupDate: date,
    pickupTime: 'morning',
    tripType: 'HOME_TO_AIRPORT',
    pickupLocation: 'Test Location, Bhilai',
    dropoffLocation: 'Raipur Airport',
    price: 500
  });

  console.log('Booking data:', postData);

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
        const result = JSON.parse(data);
        console.log(`Booking Number: ${result.booking.bookingNumber}`);
        verifyInAdmin(result.booking.bookingNumber);
      } else {
        console.log('❌ Booking failed');
        
        // Let's try to understand why it failed
        console.log('\n🔍 Debugging the issue...');
        debugBookingIssue(date);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

function debugBookingIssue(date) {
  // Check server logs
  console.log('The booking failed even though availability exists.');
  console.log('This suggests there might be an issue with:');
  console.log('1. Date format conversion in the booking route');
  console.log('2. Time zone issues');
  console.log('3. Database query logic');
  console.log('4. Validation logic');
  
  // Let's check what the server is actually receiving
  console.log(`\nDate being sent: ${date}`);
  console.log(`Date object: ${new Date(date)}`);
  console.log(`ISO String: ${new Date(date).toISOString()}`);
}

function verifyInAdmin(bookingNumber) {
  console.log('\n🔐 Verifying in admin panel...');
  
  // Login as admin
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
        
        // Get admin dashboard
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
            if (res.statusCode === 200) {
              const dashboard = JSON.parse(dashboardData);
              console.log('Dashboard stats:');
              console.log(`- Total bookings: ${dashboard.statistics.totalBookings}`);
              console.log(`- Recent bookings: ${dashboard.recentBookings.length}`);
              
              // Check if our booking is in recent bookings
              const found = dashboard.recentBookings.find(b => b.bookingNumber === bookingNumber);
              if (found) {
                console.log('✅ Booking found in admin dashboard!');
              } else {
                console.log('ℹ️  Booking may not be in recent list (limited to 5)');
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
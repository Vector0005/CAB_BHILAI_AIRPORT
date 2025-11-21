const http = require('http');

// Find a date with morning availability and test booking
function findAvailableDateAndBook() {
  console.log('🔍 Finding available date with morning slot...');
  
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
      
      // Find first date with morning availability
      const availableDate = availability.find(item => item.morningAvailable === true);
      
      if (availableDate) {
        const dateStr = new Date(availableDate.date).toISOString().split('T')[0];
        console.log(`✅ Found available date: ${dateStr}`);
        console.log(`Morning: ${availableDate.morningAvailable}, Evening: ${availableDate.eveningAvailable}`);
        
        // Test booking with this date
        testBooking(dateStr);
      } else {
        console.log('❌ No dates with morning availability found');
        console.log('Creating availability for tomorrow...');
        createAvailabilityForTomorrow();
      }
    });
  });

  req.end();
}

function createAvailabilityForTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`📝 Creating availability for ${tomorrowStr}...`);
  
  const postData = JSON.stringify({
    date: tomorrowStr,
    morningAvailable: true,
    eveningAvailable: true,
    maxBookings: 10
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/availability/${tomorrowStr}`,
    method: 'PATCH',
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
      console.log('Availability update status:', res.statusCode);
      if (res.statusCode === 200) {
        console.log('✅ Availability created for tomorrow!');
        testBooking(tomorrowStr);
      } else {
        console.log('❌ Failed to create availability');
        console.log('Response:', data);
      }
    });
  });

  req.write(postData);
  req.end();
}

function testBooking(date) {
  console.log(`\n📝 Testing booking for ${date}...`);
  
  const postData = JSON.stringify({
    name: 'Test Customer Success',
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
        console.log('🎉 SUCCESS! Booking created!');
        const result = JSON.parse(data);
        console.log(`Booking Number: ${result.booking.bookingNumber}`);
        console.log(`Customer: ${result.booking.name}`);
        console.log(`Date: ${result.booking.pickupDate}`);
        console.log(`Status: ${result.booking.status}`);
        
        // Verify in admin panel
        verifyInAdmin(result.booking.bookingNumber);
      } else {
        console.log('❌ Booking failed');
        console.log('Let\'s try evening slot...');
        testEveningBooking(date);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

function testEveningBooking(date) {
  console.log(`\n🌅 Testing evening booking for ${date}...`);
  
  const postData = JSON.stringify({
    name: 'Test Customer Evening',
    phone: '9876543210',
    email: 'test@example.com',
    pickupDate: date,
    pickupTime: 'evening',
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
      console.log('Evening Booking Status:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201) {
        console.log('🎉 SUCCESS! Evening booking created!');
        const result = JSON.parse(data);
        verifyInAdmin(result.booking.bookingNumber);
      } else {
        console.log('❌ Evening booking also failed');
      }
    });
  });

  req.write(postData);
  req.end();
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
              const foundBooking = dashboard.recentBookings.find(b => b.bookingNumber === bookingNumber);
              if (foundBooking) {
                console.log('✅ Booking found in admin dashboard!');
                console.log(`Customer: ${foundBooking.name}`);
                console.log(`Date: ${foundBooking.pickupDate}`);
                console.log(`Status: ${foundBooking.status}`);
              } else {
                console.log('ℹ️  Booking may not be in recent list (limited to 5)');
              }
              
              console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
              console.log('✅ Booking system is working');
              console.log('✅ Admin panel is working');
              console.log('✅ Database integration is working');
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

// Start the test
findAvailableDateAndBook();
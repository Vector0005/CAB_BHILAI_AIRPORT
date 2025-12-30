const http = require('http');

// Get tomorrow's date in YYYY-MM-DD format
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

console.log('Testing with tomorrow\'s date:', tomorrowStr);

// Test booking with tomorrow's date
const postData = JSON.stringify({
  name: 'Test Customer Tomorrow',
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
      verifyBooking();
    } else {
      console.log('❌ Booking failed');
      
      // Let's check what dates are actually available
      checkAvailableDates();
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
        const ourBooking = bookings.find(b => b.name === 'Test Customer Tomorrow');
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

function checkAvailableDates() {
  console.log('\n📅 Checking available dates...');
  
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
      if (res.statusCode === 200) {
        const availability = JSON.parse(data);
        console.log('Available dates (next 5):');
        availability.slice(0, 5).forEach(item => {
          const date = new Date(item.date);
          const dateStr = date.toISOString().split('T')[0];
          console.log(`- ${dateStr}: Morning: ${item.morningAvailable}, Evening: ${item.eveningAvailable}`);
        });
        
        // Find first available morning slot
        const firstAvailableMorning = availability.find(item => item.morningAvailable === true);
        if (firstAvailableMorning) {
          const availableDate = new Date(firstAvailableMorning.date).toISOString().split('T')[0];
          console.log(`\n🎯 First available morning: ${availableDate}`);
          console.log('Try booking with this date manually.');
        }
      }
    });
  });

  req.end();
}

req.write(postData);
req.end();
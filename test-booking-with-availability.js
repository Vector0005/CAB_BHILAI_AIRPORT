const http = require('http');

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
    console.log('Available dates:');
    availability.slice(0, 5).forEach(item => {
      const date = new Date(item.date);
      console.log(`- ${date.toISOString().split('T')[0]}: Morning: ${item.morningAvailable}, Evening: ${item.eveningAvailable}`);
    });
    
    // Test booking with first available date
    if (availability.length > 0) {
      const firstAvailable = availability.find(item => item.morningAvailable === true);
      if (firstAvailable) {
        const availableDate = new Date(firstAvailable.date).toISOString().split('T')[0];
        console.log(`\nTesting booking with date: ${availableDate}`);
        testBooking(availableDate);
      }
    }
  });
});

function testBooking(date) {
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
      } else {
        console.log('❌ Booking failed');
      }
    });
  });

  req.write(postData);
  req.end();
}

req.end();
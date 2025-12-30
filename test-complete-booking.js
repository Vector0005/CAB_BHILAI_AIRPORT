const http = require('http');

const bookingData = {
  name: 'Complete Test User',
  phone: '1234567890',
  email: 'test@example.com',
  pickupDate: '2025-11-20',
  pickupTime: 'morning',
  tripType: 'HOME_TO_AIRPORT',
  pickupLocation: 'Test Location',
  dropoffLocation: 'Raipur Airport',
  price: 500
};

const postData = JSON.stringify(bookingData);

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

console.log('🧪 TESTING COMPLETE BOOKING SYSTEM');
console.log('📤 Request data:', JSON.stringify(bookingData, null, 2));
console.log('');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📥 Response status: ${res.statusCode}`);
    console.log(`📄 Response data: ${data}`);
    
    if (res.statusCode === 201) {
      console.log('✅ COMPLETE BOOKING SUCCESSFUL!');
      
      // Parse the response to get booking details
      try {
        const response = JSON.parse(data);
        console.log(`📋 Booking Number: ${response.booking.bookingNumber}`);
        console.log(`👤 Customer: ${response.booking.name}`);
        console.log(`📅 Date: ${response.booking.pickupDate}`);
        console.log(`⏰ Time: ${response.booking.pickupTime}`);
        console.log(`💰 Price: ₹${response.booking.price}`);
      } catch (e) {
        console.log('Could not parse response details');
      }
    } else {
      console.log('❌ BOOKING FAILED');
      try {
        const errorData = JSON.parse(data);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error response:', data);
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();
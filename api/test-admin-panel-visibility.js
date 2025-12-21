import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Test admin panel booking visibility
async function testAdminPanelVisibility() {
  console.log('🔍 Testing Admin Panel Booking Visibility...');
  
  try {
    // Test 1: Check if admin login works
    console.log('🔐 Testing admin login...');
    const loginResponse = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@raipurtaxi.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginResponse.ok) {
      throw new Error(`Admin login failed: ${loginData.message}`);
    }
    
    assert(loginData.token, 'Admin token should be present');
    console.log('✅ Admin login successful');
    
    // Test 2: Get admin dashboard data
    console.log('📊 Testing admin dashboard...');
    const dashboardResponse = await fetch('http://localhost:3001/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard data:', dashboardData);
    
    if (!dashboardResponse.ok) {
      throw new Error(`Dashboard fetch failed: ${dashboardData.message}`);
    }
    
    assert(dashboardData.statistics.totalBookings !== undefined, 'Total bookings should be present');
    assert(dashboardData.statistics.pendingBookings !== undefined, 'Pending bookings should be present');
    assert(dashboardData.statistics.completedBookings !== undefined, 'Confirmed bookings should be present');
    console.log('✅ Admin dashboard data retrieved successfully');
    
    // Test 3: Check bookings from dashboard
    console.log('📋 Testing bookings list from dashboard...');
    const bookingsData = dashboardData.recentBookings;
    console.log(`Found ${bookingsData.length} bookings in admin panel`);
    
    assert(Array.isArray(bookingsData), 'Bookings should be an array');
    assert(bookingsData.length > 0, 'Should have at least one booking');
    
    // Check if our test booking is visible
    const testBooking = bookingsData.find(booking => 
      booking.name === 'Complete Test User' && 
      booking.price === 500
    );
    
    if (testBooking) {
      console.log('✅ Test booking found in admin panel:');
      console.log(`   Booking Number: ${testBooking.bookingNumber}`);
      console.log(`   Customer: ${testBooking.name}`);
      console.log(`   Price: ₹${testBooking.price}`);
      console.log(`   Status: ${testBooking.status}`);
    } else {
      console.log('⚠️  Test booking not found in admin panel');
      console.log('Available bookings:', bookingsData.map(b => ({ name: b.name, price: b.price })));
    }
    
    // Test 4: Verify booking details are complete
    if (bookingsData.length > 0) {
      const firstBooking = bookingsData[0];
      console.log(`🔍 Verifying booking details for ${firstBooking.bookingNumber}...`);
      
      assert(firstBooking.bookingNumber, 'Booking number should be present');
      assert(firstBooking.name, 'Customer name should be present');
      assert(firstBooking.pickupLocation, 'Pickup location should be present');
      assert(firstBooking.dropoffLocation, 'Dropoff location should be present');
      assert(firstBooking.pickupDate, 'Pickup date should be present');
      assert(firstBooking.pickupTime, 'Pickup time should be present');
      assert(firstBooking.status, 'Status should be present');
      assert(firstBooking.price !== undefined, 'Price should be present');
      
      console.log('✅ Booking details are complete');
      console.log(`   Booking Number: ${firstBooking.bookingNumber}`);
      console.log(`   Customer: ${firstBooking.name}`);
      console.log(`   Trip Type: ${firstBooking.tripType}`);
      console.log(`   Status: ${firstBooking.status}`);
    }
    
    return {
      success: true,
      message: 'Admin panel booking visibility test completed successfully',
      totalBookings: dashboardData.statistics.totalBookings,
      pendingBookings: dashboardData.statistics.pendingBookings,
      confirmedBookings: dashboardData.statistics.completedBookings,
      testBookingFound: !!testBooking
    };
    
  } catch (error) {
    console.error('❌ Admin panel visibility test failed:', error.message);
    return {
      success: false,
      message: `Admin panel visibility test failed: ${error.message}`
    };
  }
}

// Run the test
test('Admin Panel Booking Visibility', async () => {
  const result = await testAdminPanelVisibility();
  assert(result.success, result.message);
});

// Export for use in other tests
export { testAdminPanelVisibility };
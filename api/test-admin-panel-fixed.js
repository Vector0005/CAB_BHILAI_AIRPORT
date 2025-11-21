import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testAdminPanelFixed() {
  console.log('=== Testing Admin Panel (Fixed) ===');
  
  try {
    // Test admin login
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
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('✅ Admin login successful');
      console.log('   Token:', loginResult.token.substring(0, 20) + '...');
      console.log('   User:', loginResult.user.name);
      console.log('   Role:', loginResult.user.role);
      
      // Test dashboard data access
      const dashboardResponse = await fetch('http://localhost:3001/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${loginResult.token}`
        }
      });
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('✅ Dashboard data accessible');
        console.log('   Dashboard data structure:', Object.keys(dashboardData));
        
        // Display available data
        if (dashboardData.totalBookings !== undefined) {
          console.log('   Total bookings:', dashboardData.totalBookings);
        }
        if (dashboardData.todayBookings !== undefined) {
          console.log('   Today bookings:', dashboardData.todayBookings);
        }
        if (dashboardData.pendingBookings !== undefined) {
          console.log('   Pending bookings:', dashboardData.pendingBookings);
        }
        
      } else {
        console.log('❌ Dashboard data access failed:', dashboardResponse.status);
        const errorData = await dashboardResponse.text();
        console.log('   Error:', errorData);
      }
      
      // Test bookings list
      const bookingsResponse = await fetch('http://localhost:3001/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${loginResult.token}`
        }
      });
      
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        console.log('✅ Bookings list accessible');
        console.log('   Bookings data type:', typeof bookingsData);
        console.log('   Bookings data structure:', Array.isArray(bookingsData) ? 'Array' : 'Object');
        
        if (Array.isArray(bookingsData)) {
          console.log('   Total bookings in database:', bookingsData.length);
          
          // Show recent bookings
          const recentBookings = bookingsData.slice(0, 3);
          recentBookings.forEach((booking, index) => {
            console.log(`   ${index + 1}. ${booking.bookingNumber} - ${booking.name} (${booking.pickupDate.split('T')[0]} ${booking.pickupTime})`);
          });
        } else if (bookingsData.bookings) {
          console.log('   Total bookings:', bookingsData.bookings.length);
          bookingsData.bookings.slice(0, 3).forEach((booking, index) => {
            console.log(`   ${index + 1}. ${booking.bookingNumber} - ${booking.name}`);
          });
        } else {
          console.log('   Bookings data:', JSON.stringify(bookingsData, null, 2));
        }
        
      } else {
        console.log('❌ Bookings list access failed:', bookingsResponse.status);
        const errorData = await bookingsResponse.text();
        console.log('   Error:', errorData);
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Admin login failed:', errorData.error || errorData.message);
    }
    
  } catch (error) {
    console.log('❌ Admin panel test failed:', error.message);
  }
}

testAdminPanelFixed().catch(console.error).finally(() => prisma.$disconnect());
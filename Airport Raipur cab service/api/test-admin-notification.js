// Test admin panel notification system
async function testAdminNotification() {
    try {
        console.log('🧪 Testing admin panel notification system...');
        
        // Login as admin
        const loginResponse = await fetch('http://localhost:3001/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@raipurtaxi.com',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
            console.log('❌ Admin login failed:', loginData.message);
            return;
        }

        console.log('✅ Admin login successful');
        
        // Get dashboard data
        const dashboardResponse = await fetch('http://localhost:3001/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        const dashboardData = await dashboardResponse.json();
        
        if (dashboardResponse.ok) {
            console.log('✅ Dashboard data retrieved successfully');
            console.log('📊 Stats:', dashboardData.stats);
            console.log('📋 Recent bookings count:', dashboardData.recentBookings?.length || 0);
            
            // Check for pending bookings
            if (dashboardData.stats && dashboardData.stats.pendingBookings > 0) {
                console.log(`🚨 Found ${dashboardData.stats.pendingBookings} pending bookings that need confirmation!`);
                
                // Get recent bookings to see the test booking
                const recentBookings = dashboardData.recentBookings;
                if (recentBookings && recentBookings.length > 0) {
                    console.log('📋 Recent bookings:');
                    recentBookings.forEach(booking => {
                        console.log(`  - Booking ${booking.id}: ${booking.name}, Status: ${booking.status}, Date: ${new Date(booking.pickupDate).toLocaleDateString()}`);
                    });
                }
            } else {
                console.log('ℹ️ No pending bookings found');
            }
        } else {
            console.log('❌ Failed to get dashboard data:', dashboardData.message);
        }

    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

testAdminNotification();
// Check admin dashboard response structure
async function checkAdminDashboard() {
    try {
        console.log('🔍 Checking admin dashboard response structure...');
        
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
        
        console.log('📊 Full Dashboard Response:');
        console.log(JSON.stringify(dashboardData, null, 2));
        
        // Check for pending bookings in different ways
        if (dashboardData.stats) {
            console.log('✅ Found stats object');
            console.log('Pending bookings:', dashboardData.stats.pendingBookings);
        } else {
            console.log('❌ No stats object found');
            console.log('Available keys:', Object.keys(dashboardData));
        }

    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

checkAdminDashboard();
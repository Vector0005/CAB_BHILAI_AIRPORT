// Test morning slot booking
async function testMorningBooking() {
    const testData = {
        name: "Test Morning User",
        phone: "9876543210",
        email: "test@morning.com",
        pickupDate: "2025-11-21",
        pickupTime: "morning",
        tripType: "HOME_TO_AIRPORT",
        pickupLocation: "Durg City Center",
        dropoffLocation: "Raipur Airport Terminal 1",
        price: 500
    };

    try {
        console.log('🧪 Testing morning slot booking...');
        console.log('Test data:', testData);

        const response = await fetch('http://localhost:3001/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', result);

        if (response.ok) {
            console.log('✅ Morning booking successful!');
            console.log('Booking ID:', result.booking.bookingNumber);
            console.log('Status:', result.booking.status);
        } else {
            console.log('❌ Morning booking failed:', result.error || result.message);
            if (result.errors) {
                console.log('Validation errors:', result.errors);
            }
        }

    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

testMorningBooking();
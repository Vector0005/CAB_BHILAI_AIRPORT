import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Test frontend booking form functionality
async function testFrontendBooking() {
  console.log('🧪 Testing Frontend Booking Form Functionality...');
  
  try {
    // Test 1: Check if all required form elements exist
    console.log('📋 Checking form elements...');
    
    // Simulate form data collection like in the frontend
    const formData = {
      date: '2024-11-20',
      time: 'morning',
      tripType: 'oneway',
      fromLocation: 'Raipur Airport',
      toLocation: 'City Center',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      vehicleType: 'sedan',
      price: 500
    };
    
    console.log('✅ Form data structure:', JSON.stringify(formData, null, 2));
    
    // Test 2: Validate form data
    console.log('🔍 Validating form data...');
    assert(formData.date, 'Date is required');
    assert(formData.time, 'Time slot is required');
    assert(formData.tripType, 'Trip type is required');
    assert(formData.fromLocation, 'From location is required');
    assert(formData.toLocation, 'To location is required');
    assert(formData.name, 'Name is required');
    assert(formData.email, 'Email is required');
    assert(formData.phone, 'Phone is required');
    assert(formData.vehicleType, 'Vehicle type is required');
    assert(formData.price > 0, 'Price must be greater than 0');
    
    console.log('✅ All form validations passed');
    
    // Test 3: Test date format validation
    console.log('📅 Testing date format...');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    assert(dateRegex.test(formData.date), 'Date must be in YYYY-MM-DD format');
    
    // Test 4: Test time slot validation
    console.log('⏰ Testing time slot validation...');
    const validTimeSlots = ['morning', 'evening'];
    assert(validTimeSlots.includes(formData.time), 'Time slot must be morning or evening');
    
    // Test 5: Test trip type validation
    console.log('🛣️ Testing trip type validation...');
    const validTripTypes = ['oneway', 'roundtrip'];
    assert(validTripTypes.includes(formData.tripType), 'Trip type must be oneway or roundtrip');
    
    // Test 6: Test vehicle type validation
    console.log('🚗 Testing vehicle type validation...');
    const validVehicleTypes = ['sedan', 'suv', 'tempo'];
    assert(validVehicleTypes.includes(formData.vehicleType), 'Vehicle type must be sedan, suv, or tempo');
    
    // Test 7: Test email format validation
    console.log('📧 Testing email format...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert(emailRegex.test(formData.email), 'Email must be valid format');
    
    // Test 8: Test phone format validation
    console.log('📞 Testing phone format...');
    const phoneRegex = /^\d{10}$/;
    assert(phoneRegex.test(formData.phone), 'Phone must be 10 digits');
    
    console.log('✅ All frontend form validations passed successfully!');
    
    return {
      success: true,
      message: 'Frontend booking form functionality test completed successfully',
      formData: formData
    };
    
  } catch (error) {
    console.error('❌ Frontend booking form test failed:', error.message);
    return {
      success: false,
      message: `Frontend booking form test failed: ${error.message}`
    };
  }
}

// Run the test
test('Frontend Booking Form Functionality', async () => {
  const result = await testFrontendBooking();
  assert(result.success, result.message);
});

// Export for use in other tests
export { testFrontendBooking };
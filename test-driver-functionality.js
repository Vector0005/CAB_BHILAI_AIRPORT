/**
 * Test script for driver functionality
 * This script tests the driver CRUD operations in the admin dashboard
 */

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;

function logTest(testName, passed, message = '') {
    if (passed) {
        console.log(`✅ ${testName}`);
        testsPassed++;
    } else {
        console.log(`❌ ${testName}: ${message}`);
        testsFailed++;
    }
}

async function testDriverAPI() {
    console.log('🧪 Starting Driver Functionality Tests...\n');
    
    // Generate unique data to avoid conflicts
    const timestamp = Date.now();
    const testDriverData = {
        name: `Test Driver ${timestamp}`,
        email: `test.${timestamp}@example.com`,
        phone: String(Math.floor(1000000000 + Math.random() * 9000000000)), // 10 digit random
        license: `TEST-${timestamp}`,
        vehicle: 'Sedan',
        vehicleNo: `TEST${timestamp}`,
        status: 'AVAILABLE'
    };
    
    let createdDriverId = null;
    
    try {
        // Test 1: Create a new driver
        console.log('Test 1: Creating a new driver...');
        const createResponse = await fetch(`${API_BASE_URL}/drivers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testDriverData)
        });
        
        const createResult = await createResponse.json();
        logTest('Driver Creation', 
            createResponse.ok && (createResult.success === true || createResult.message?.includes('successfully')), 
            createResult.message || 'Failed to create driver'
        );
        
        if (createResponse.ok && (createResult.success === true || createResult.message?.includes('successfully'))) {
            createdDriverId = createResult.driver?.id || createResult.id;
            console.log(`   Created driver with ID: ${createdDriverId}`);
        }
        
        // Test 2: Get all drivers
        console.log('\nTest 2: Fetching all drivers...');
        const getAllResponse = await fetch(`${API_BASE_URL}/drivers`);
        const getAllResult = await getAllResponse.json();
        const drivers = Array.isArray(getAllResult) ? getAllResult : (getAllResult.drivers || []);
        
        logTest('Get All Drivers', 
            getAllResponse.ok && drivers.length > 0, 
            'Failed to fetch drivers'
        );
        
        if (createdDriverId) {
            const foundDriver = drivers.find(d => d.id === createdDriverId);
            logTest('Verify Created Driver Exists', 
                !!foundDriver, 
                'Created driver not found in list'
            );
        }
        
        // Test 3: Update driver (if we have a created driver)
        if (createdDriverId) {
            console.log('\nTest 3: Updating driver...');
            const updateData = {
                ...testDriverData,
                name: 'Updated Test Driver',
                status: 'UNAVAILABLE'
            };
            
            const updateResponse = await fetch(`${API_BASE_URL}/drivers/${createdDriverId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });
            
            const updateResult = await updateResponse.json();
            logTest('Driver Update', 
                updateResponse.ok && (updateResult.success === true || updateResult.message?.includes('successfully')), 
                updateResult.message || 'Failed to update driver'
            );
        } else {
            console.log('\nTest 3: Skipping update test (no driver created)');
        }
        
        // Test 4: Delete driver (if we have a created driver)
        if (createdDriverId) {
            console.log('\nTest 4: Deleting driver...');
            const deleteResponse = await fetch(`${API_BASE_URL}/drivers/${createdDriverId}`, {
                method: 'DELETE'
            });
            
            const deleteResult = await deleteResponse.json();
            logTest('Driver Deletion', 
                deleteResponse.ok && (deleteResult.success === true || deleteResult.message?.includes('successfully')), 
                deleteResult.message || 'Failed to delete driver'
            );
            
            // Verify deletion
            const verifyResponse = await fetch(`${API_BASE_URL}/drivers/${createdDriverId}`);
            logTest('Verify Driver Deletion', 
                !verifyResponse.ok, 
                'Driver still exists after deletion'
            );
        } else {
            console.log('\nTest 4: Skipping delete test (no driver created)');
        }
        
        // Test 5: Validation testing
        console.log('\nTest 5: Testing validation...');
        const invalidDriverData = {
            name: '',  // Missing name
            email: 'invalid-email',  // Invalid email
            phone: '123',  // Invalid phone (not 10 digits)
            license: '',  // Missing license
            vehicle: '',
            vehicleNo: '',
            status: 'AVAILABLE'
        };
        
        const invalidResponse = await fetch(`${API_BASE_URL}/drivers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidDriverData)
        });
        
        logTest('Validation - Invalid Data Rejection', 
            !invalidResponse.ok, 
            'Should reject invalid data'
        );
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        testsFailed++;
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    
    if (testsFailed === 0) {
        console.log('\n🎉 All tests passed! Driver functionality is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }
    
    return { testsPassed, testsFailed };
}

// Run tests if this script is executed directly
if (require.main === module) {
    testDriverAPI().then(results => {
        process.exit(results.testsFailed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Test script failed:', error);
        process.exit(1);
    });
}

module.exports = { testDriverAPI };
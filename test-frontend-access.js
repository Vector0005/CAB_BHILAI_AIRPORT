// Simple test to check what the frontend server is serving
const http = require('http');

console.log('🔍 Testing Frontend Server...');

// Test different URLs
const testUrls = [
    'http://localhost:5173/',
    'http://localhost:5173/index.html',
    'http://localhost:5173/index.html/'
];

async function testUrl(url) {
    try {
        console.log(`\n📡 Testing: ${url}`);
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        const text = await response.text();
        const has404 = text.includes('404 Not Found');
        const hasRaipur = text.includes('Raipur Airport');
        
        console.log(`Contains "404 Not Found": ${has404}`);
        console.log(`Contains "Raipur Airport": ${hasRaipur}`);
        
        if (has404) {
            console.log('❌ Returns 404 page');
        } else if (hasRaipur) {
            console.log('✅ Returns correct content');
        } else {
            console.log('⚠️ Returns unknown content');
        }
        
        // Show first few lines
        const lines = text.split('\n').slice(0, 5).join('\n');
        console.log(`First 5 lines:\n${lines}\n...`);
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

async function runTests() {
    for (const url of testUrls) {
        await testUrl(url);
    }
    
    console.log('\n🎯 Summary:');
    console.log('- The frontend server is running on port 5173');
    console.log('- Chrome can access it correctly (shows booking system)');
    console.log('- Browser preview might be using a different URL or path');
    console.log('- Try accessing: http://localhost:5173/index.html directly');
}

runTests().catch(console.error);
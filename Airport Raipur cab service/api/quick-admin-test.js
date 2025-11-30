// Quick test to verify admin panel accessibility
fetch('http://localhost:8080', { method: 'HEAD' })
  .then(response => {
    console.log('Admin Panel Status:', response.ok ? '✅ Accessible' : `⚠️  Status: ${response.status}`);
  })
  .catch(error => {
    console.log('❌ Admin Panel Error:', error.message);
    console.log('💡 Try accessing directly at: http://localhost:8080');
    console.log('💡 Admin credentials: admin@raipurtaxi.com / admin123');
  });

// Test admin panel HTML content
setTimeout(() => {
  fetch('http://localhost:8080/admin.html')
    .then(response => response.text())
    .then(html => {
      if (html.includes('Admin Login') || html.includes('Dashboard')) {
        console.log('✅ Admin panel HTML content loaded successfully');
      } else {
        console.log('⚠️  Admin panel content may be different than expected');
      }
    })
    .catch(error => console.log('❌ Admin panel HTML test failed:', error.message));
}, 1000);
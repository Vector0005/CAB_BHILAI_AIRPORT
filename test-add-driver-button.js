// Simple test to verify Add Driver button functionality
console.log('Testing Add Driver button functionality...');

// Check if the button exists
const addDriverBtn = document.getElementById('addDriverBtn');
console.log('Add Driver button found:', !!addDriverBtn);

if (addDriverBtn) {
    console.log('Button text:', addDriverBtn.textContent);
    console.log('Button classes:', addDriverBtn.className);
    
    // Add a test click handler
    addDriverBtn.addEventListener('click', function(e) {
        console.log('Add Driver button clicked!');
        console.log('Event target:', e.target);
        console.log('Event target ID:', e.target.id);
        
        // Check if modal exists
        const modal = document.getElementById('driverModal');
        console.log('Driver modal found:', !!modal);
        
        if (modal) {
            console.log('Modal current display:', modal.style.display);
            modal.style.display = 'flex';
            console.log('Modal should now be visible');
        }
    });
    
    console.log('Test click handler added');
} else {
    console.log('Add Driver button not found in DOM');
}

// Check if existing event listeners are working
document.addEventListener('click', function(e) {
    if (e.target.id === 'addDriverBtn') {
        console.log('Document-level click detected for addDriverBtn');
    }
});
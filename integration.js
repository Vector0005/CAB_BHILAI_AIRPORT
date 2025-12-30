// Simple Integration Script to connect frontend to backend
class BookingIntegration {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api';
        this.init();
    }

    init() {
        this.setupBookingIntegration();
        this.setupAvailabilitySync();
    }

    setupBookingIntegration() {
        // Override the existing booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleBookingSubmission();
            });
        }
    }

    async handleBookingSubmission() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccessMessage(result);
                this.resetForm();
            } else {
                const error = await response.json();
                this.showErrorMessage(error.message || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showErrorMessage('Network error. Please try again.');
        }
    }

    collectFormData() {
        return {
            customerName: document.getElementById('customerName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            date: this.getSelectedDate(),
            timeSlot: this.getSelectedTimeSlot(),
            tripType: this.getSelectedTripType(),
            pickupLocation: document.getElementById('pickupLocation').value,
            amount: this.calculateAmount()
        };
    }

    validateFormData(data) {
        const errors = [];

        if (!data.customerName.trim()) {
            errors.push('Please enter your name');
        }

        if (!data.phoneNumber.trim()) {
            errors.push('Please enter your phone number');
        } else if (!/^\d{10}$/.test(data.phoneNumber)) {
            errors.push('Please enter a valid 10-digit phone number');
        }

        if (!data.date) {
            errors.push('Please select a date');
        }

        if (!data.timeSlot) {
            errors.push('Please select a time slot');
        }

        if (!data.tripType) {
            errors.push('Please select trip type');
        }

        if (!data.pickupLocation.trim()) {
            errors.push('Please enter pickup location');
        }

        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return false;
        }

        return true;
    }

    getSelectedDate() {
        // Get selected date from calendar
        const selectedDay = document.querySelector('.calendar-day.selected');
        if (selectedDay) {
            const dayNumber = selectedDay.querySelector('.calendar-day-number').textContent;
            const currentMonth = new Date();
            return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), parseInt(dayNumber)).toISOString().split('T')[0];
        }
        return null;
    }

    getSelectedTimeSlot() {
        const activeTab = document.querySelector('.time-tab.active');
        return activeTab ? activeTab.dataset.time : null;
    }

    getSelectedTripType() {
        const selectedRadio = document.querySelector('input[name="tripType"]:checked');
        return selectedRadio ? selectedRadio.value : null;
    }

    calculateAmount() {
        const tripType = this.getSelectedTripType();
        const basePrice = 500; // Base price in INR
        
        switch (tripType) {
            case 'round_trip':
                return Math.round(basePrice * 1.8); // 10% discount
            case 'home_to_airport':
            case 'airport_to_home':
                return basePrice;
            default:
                return basePrice;
        }
    }

    showSuccessMessage(booking) {
        alert(`✅ Booking Confirmed!\n\n` +
              `Booking ID: ${booking.id}\n` +
              `Customer: ${booking.customerName}\n` +
              `Date: ${new Date(booking.date).toLocaleDateString()}\n` +
              `Time: ${booking.timeSlot}\n` +
              `Trip: ${booking.tripType.replace('_', ' ')}\n` +
              `Amount: ₹${booking.amount}\n\n` +
              `You will receive a confirmation email/SMS shortly.`);
    }

    showErrorMessage(message) {
        alert('❌ Booking Failed\n\n' + message);
    }

    resetForm() {
        // Reset form fields
        document.getElementById('customerName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('pickupLocation').value = '';
        
        // Reset radio buttons
        document.querySelectorAll('input[name="tripType"]').forEach(radio => {
            radio.checked = false;
        });
        
        // Reset time tabs
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Reset calendar selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
    }

    setupAvailabilitySync() {
        // Sync availability data from backend
        this.syncAvailability();
        
        // Refresh availability every 30 seconds
        setInterval(() => {
            this.syncAvailability();
        }, 30000);
    }

    async syncAvailability() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/availability`);
            if (response.ok) {
                const availability = await response.json();
                this.updateCalendarAvailability(availability);
            }
        } catch (error) {
            console.error('Error syncing availability:', error);
            // Use mock data as fallback
            this.generateMockAvailability();
        }
    }

    updateCalendarAvailability(availabilityData) {
        // Update calendar with availability data
        availabilityData.forEach(item => {
            const dateStr = item.date;
            const dateElement = this.findDateElement(dateStr);
            
            if (dateElement) {
                this.updateDateElement(dateElement, item);
            }
        });
    }

    findDateElement(dateStr) {
        const targetDate = new Date(dateStr);
        const dayNumber = targetDate.getDate();
        
        // Find the calendar day element with matching day number
        const dayElements = document.querySelectorAll('.calendar-day');
        for (let element of dayElements) {
            const dayNumElement = element.querySelector('.calendar-day-number');
            if (dayNumElement && dayNumElement.textContent == dayNumber) {
                return element;
            }
        }
        return null;
    }

    updateDateElement(element, availability) {
        const statusElement = element.querySelector('.calendar-day-status');
        if (!statusElement) return;

        // Remove existing status classes
        element.classList.remove('available', 'partial', 'unavailable');

        // Determine new status
        let status = 'available';
        let statusText = 'Both Available';

        if (!availability.morningAvailable && !availability.eveningAvailable) {
            status = 'unavailable';
            statusText = 'Fully Booked';
        } else if (!availability.morningAvailable) {
            status = 'partial';
            statusText = 'Evening Available';
        } else if (!availability.eveningAvailable) {
            status = 'partial';
            statusText = 'Morning Available';
        }

        element.classList.add(status);
        statusElement.textContent = statusText;
    }

    generateMockAvailability() {
        // Generate mock availability for demo purposes
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const morningAvailable = Math.random() > 0.3;
            const eveningAvailable = Math.random() > 0.3;
            
            const mockAvailability = {
                date: dateStr,
                morningAvailable,
                eveningAvailable
            };
            
            this.updateCalendarAvailability([mockAvailability]);
        }
    }
}

// Initialize integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BookingIntegration();
});
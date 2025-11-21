// Enhanced Frontend Script with Backend API Integration
class AirportBookingSystem {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api';
        this.currentDate = new Date();
        this.selectedDate = null;
        this.availabilityData = {};
        this.bookingData = {
            customerName: '',
            phoneNumber: '',
            date: '',
            timeSlot: '',
            tripType: '',
            pickupLocation: ''
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.generateCalendar();
        await this.loadAvailability();
        this.updateSelectedDateDisplay();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBooking();
        });

        // Time slot selection
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectTimeSlot(e.target.dataset.time);
            });
        });

        // Trip type selection
        document.querySelectorAll('input[name="tripType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.bookingData.tripType = e.target.value;
            });
        });

        // Location input with GPS detection
        document.getElementById('getLocationBtn').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // Input validation
        document.getElementById('customerName').addEventListener('input', (e) => {
            this.bookingData.customerName = e.target.value;
        });

        document.getElementById('phoneNumber').addEventListener('input', (e) => {
            this.bookingData.phoneNumber = e.target.value;
        });

        document.getElementById('pickupLocation').addEventListener('input', (e) => {
            this.bookingData.pickupLocation = e.target.value;
        });
    }

    async loadAvailability() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/availability`);
            if (response.ok) {
                const availability = await response.json();
                this.availabilityData = availability.reduce((acc, item) => {
                    acc[item.date] = {
                        morning: item.morningAvailable,
                        evening: item.eveningAvailable
                    };
                    return acc;
                }, {});
                this.generateCalendar();
            }
        } catch (error) {
            console.error('Error loading availability:', error);
            // Fallback to mock data if API fails
            this.generateMockAvailability();
        }
    }

    generateMockAvailability() {
        // Generate mock availability for the next 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Random availability for demo
            const morningAvailable = Math.random() > 0.3;
            const eveningAvailable = Math.random() > 0.3;
            
            this.availabilityData[dateStr] = {
                morning: morningAvailable,
                evening: eveningAvailable
            };
        }
    }

    generateCalendar() {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Calendar header
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.innerHTML = `
            <button id="prevMonth">&lt;</button>
            <h3>${this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button id="nextMonth">&gt;</button>
        `;
        calendar.appendChild(header);

        // Calendar grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });

        // Calendar days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            grid.appendChild(emptyCell);
        }

        // Calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const currentDay = new Date(year, month, day);
            const dateStr = currentDay.toISOString().split('T')[0];
            
            // Check if date is in the past
            const isPastDate = currentDay < today;
            
            if (isPastDate) {
                dayElement.classList.add('past-date');
                dayElement.style.pointerEvents = 'none';
            }

            // Get availability for this date
            const availability = this.availabilityData[dateStr] || { morning: true, evening: true };
            
            // Determine availability status
            let status = 'available';
            let statusText = 'Both Available';
            
            if (!availability.morning && !availability.evening) {
                status = 'unavailable';
                statusText = 'Fully Booked';
            } else if (!availability.morning) {
                status = 'partial';
                statusText = 'Evening Available';
            } else if (!availability.evening) {
                status = 'partial';
                statusText = 'Morning Available';
            }

            dayElement.classList.add(status);
            
            dayElement.innerHTML = `
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-day-status">${isPastDate ? '' : statusText}</div>
            `;

            if (!isPastDate) {
                dayElement.addEventListener('click', () => {
                    this.selectDate(currentDay);
                });
            }

            grid.appendChild(dayElement);
        }

        calendar.appendChild(grid);

        // Month navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.generateCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.generateCalendar();
        });
    }

    selectDate(date) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });

        // Add selection to clicked date
        const dateStr = date.toISOString().split('T')[0];
        const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            dayElement.classList.add('selected');
        }

        this.selectedDate = date;
        this.bookingData.date = dateStr;
        this.updateSelectedDateDisplay();
        this.updateTimeSlotAvailability();
    }

    updateSelectedDateDisplay() {
        const display = document.getElementById('selectedDateDisplay');
        if (display) {
            if (this.selectedDate) {
                display.innerHTML = `
                    <div class="selected-date-info">
                        <div class="selected-date-day">${this.selectedDate.getDate()}</div>
                        <div class="selected-date-month-year">${this.selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        <div class="selected-date-weekday">${this.selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                `;
                display.classList.add('has-date');
                display.classList.remove('no-date-selected');
            } else {
                display.innerHTML = '<span class="no-date-selected">Please select a date from the calendar</span>';
                display.classList.remove('has-date');
                display.classList.add('no-date-selected');
            }
        }
    }

    updateTimeSlotAvailability() {
        if (!this.selectedDate) return;

        const dateStr = this.selectedDate.toISOString().split('T')[0];
        const availability = this.availabilityData[dateStr] || { morning: true, evening: true };

        // Update morning tab
        const morningTab = document.querySelector('[data-time="morning"]');
        if (morningTab) {
            if (!availability.morning) {
                morningTab.classList.add('disabled');
                morningTab.style.pointerEvents = 'none';
            } else {
                morningTab.classList.remove('disabled');
                morningTab.style.pointerEvents = 'auto';
            }
        }

        // Update evening tab
        const eveningTab = document.querySelector('[data-time="evening"]');
        if (eveningTab) {
            if (!availability.evening) {
                eveningTab.classList.add('disabled');
                eveningTab.style.pointerEvents = 'none';
            } else {
                eveningTab.classList.remove('disabled');
                eveningTab.style.pointerEvents = 'auto';
            }
        }

        // If fully booked, disable booking button
        const bookButton = document.getElementById('bookRideBtn');
        if (!availability.morning && !availability.evening) {
            bookButton.disabled = true;
            bookButton.textContent = 'Fully Booked';
        } else {
            bookButton.disabled = false;
            bookButton.textContent = 'Book Ride';
        }
    }

    selectTimeSlot(timeSlot) {
        // Remove active class from all tabs
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to selected tab
        const selectedTab = document.querySelector(`[data-time="${timeSlot}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        this.bookingData.timeSlot = timeSlot;
    }

    async getCurrentLocation() {
        const locationBtn = document.getElementById('getLocationBtn');
        const locationInput = document.getElementById('pickupLocation');
        
        locationBtn.disabled = true;
        locationBtn.textContent = 'Getting location...';

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const { latitude, longitude } = position.coords;
                const locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                
                locationInput.value = locationText;
                this.bookingData.pickupLocation = locationText;
                
                locationBtn.textContent = 'Location Found';
                setTimeout(() => {
                    locationBtn.textContent = 'Get Current Location';
                    locationBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error getting location:', error);
                locationBtn.textContent = 'Location Failed';
                setTimeout(() => {
                    locationBtn.textContent = 'Get Current Location';
                    locationBtn.disabled = false;
                }, 2000);
            }
        } else {
            alert('Geolocation is not supported by your browser.');
            locationBtn.disabled = false;
            locationBtn.textContent = 'Get Current Location';
        }
    }

    validateForm() {
        const errors = [];

        if (!this.bookingData.customerName.trim()) {
            errors.push('Please enter your name');
        }

        if (!this.bookingData.phoneNumber.trim()) {
            errors.push('Please enter your phone number');
        } else if (!/^\d{10}$/.test(this.bookingData.phoneNumber)) {
            errors.push('Please enter a valid 10-digit phone number');
        }

        if (!this.bookingData.date) {
            errors.push('Please select a date');
        }

        if (!this.bookingData.timeSlot) {
            errors.push('Please select a time slot');
        }

        if (!this.bookingData.tripType) {
            errors.push('Please select trip type');
        }

        if (!this.bookingData.pickupLocation.trim()) {
            errors.push('Please enter pickup location');
        }

        return errors;
    }

    async handleBooking() {
        const errors = this.validateForm();
        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return;
        }

        const bookButton = document.getElementById('bookRideBtn');
        bookButton.disabled = true;
        bookButton.textContent = 'Processing...';

        try {
            // Calculate amount based on trip type
            const amount = this.calculateAmount();
            
            const bookingData = {
                ...this.bookingData,
                amount,
                status: 'pending'
            };

            const response = await fetch(`${this.API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                const result = await response.json();
                this.handleSuccessfulBooking(result);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Booking failed');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Booking failed: ' + error.message);
            bookButton.disabled = false;
            bookButton.textContent = 'Book Ride';
        }
    }

    calculateAmount() {
        const basePrice = 500; // Base price in INR
        let multiplier = 1;

        switch (this.bookingData.tripType) {
            case 'round_trip':
                multiplier = 1.8; // 10% discount for round trip
                break;
            case 'home_to_airport':
            case 'airport_to_home':
                multiplier = 1;
                break;
        }

        return Math.round(basePrice * multiplier);
    }

    handleSuccessfulBooking(booking) {
        // Show success message
        alert(`Booking confirmed!\n\n` +
              `Booking ID: ${booking.id}\n` +
              `Customer: ${booking.customerName}\n` +
              `Date: ${new Date(booking.date).toLocaleDateString()}\n` +
              `Time: ${booking.timeSlot}\n` +
              `Trip: ${booking.tripType.replace('_', ' ')}\n` +
              `Amount: ₹${booking.amount}\n\n` +
              `You will receive a confirmation email/SMS shortly.`);

        // Reset form
        this.resetForm();
        
        // Reload availability to update calendar
        this.loadAvailability();
    }

    resetForm() {
        // Reset form data
        this.bookingData = {
            customerName: '',
            phoneNumber: '',
            date: '',
            timeSlot: '',
            tripType: '',
            pickupLocation: ''
        };

        // Reset form fields
        document.getElementById('customerName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('pickupLocation').value = '';
        document.querySelectorAll('input[name="tripType"]').forEach(radio => {
            radio.checked = false;
        });

        // Reset time tabs
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active', 'disabled');
            tab.style.pointerEvents = 'auto';
        });

        // Reset selected date
        this.selectedDate = null;
        this.updateSelectedDateDisplay();

        // Reset button
        const bookButton = document.getElementById('bookRideBtn');
        bookButton.disabled = false;
        bookButton.textContent = 'Book Ride';
    }
}

// Initialize the booking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AirportBookingSystem();
});
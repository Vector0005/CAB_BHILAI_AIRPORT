// Calendar functionality
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedDateAvailability = null;
        this.availabilityData = this.generateMockAvailability();
        this.init();
    }

    generateMockAvailability() {
        const data = {};
        const today = new Date();
        
        for (let i = 0; i < 90; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateKey = this.formatDateKey(date);
            
            // Random availability for demo - track morning and evening separately
            const morningRandom = Math.random();
            const eveningRandom = Math.random();
            
            const morningAvailable = morningRandom > 0.3;
            const eveningAvailable = eveningRandom > 0.3;
            
            if (morningAvailable && eveningAvailable) {
                data[dateKey] = 'available'; // Both slots available
            } else if (!morningAvailable && !eveningAvailable) {
                data[dateKey] = 'booked'; // Both slots booked
            } else {
                data[dateKey] = {
                    type: 'partial',
                    morningAvailable: morningAvailable,
                    eveningAvailable: eveningAvailable
                };
            }
        }
        
        return data;
    }

    formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    init() {
        this.renderCalendar();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update month/year display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;

        // Clear existing calendar days
        const calendarGrid = document.getElementById('calendarGrid');
        const existingDays = calendarGrid.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const date = new Date(year, month, day);
            const dateKey = this.formatDateKey(date);
            const availability = this.availabilityData[dateKey] || 'available';
            
            // Check if date is in the past
            const currentDate = new Date(date);
            currentDate.setHours(0, 0, 0, 0);
            
            if (currentDate < today) {
                // Past date - make it faded and unclickable
                dayElement.classList.add('past-date');
                dayElement.style.pointerEvents = 'none';
                dayElement.style.cursor = 'not-allowed';
                // Add day number for past dates
                dayElement.textContent = day;
                console.log(`Date ${date.toDateString()} is in the past - disabled`);
            } else {
                // Future or current date - normal functionality
                if (typeof availability === 'object' && availability.type === 'partial') {
                    // Partial booking - show which slot is available/booked
                    dayElement.classList.add('partial');
                    
                    // Create container for content
                    const contentContainer = document.createElement('div');
                    contentContainer.style.display = 'flex';
                    contentContainer.style.flexDirection = 'column';
                    contentContainer.style.alignItems = 'center';
                    contentContainer.style.justifyContent = 'center';
                    contentContainer.style.width = '100%';
                    contentContainer.style.height = '100%';
                    
                    // Create day number
                    const dayNumber = document.createElement('div');
                    dayNumber.className = 'day-number';
                    dayNumber.textContent = day;
                    contentContainer.appendChild(dayNumber);
                    
                    // Create slot info
                    const slotInfo = document.createElement('div');
                    slotInfo.className = 'slot-info';
                    
                    if (!availability.morningAvailable && availability.eveningAvailable) {
                        slotInfo.innerHTML = '<small>Morning booked<br>Evening avail.</small>';
                    } else if (availability.morningAvailable && !availability.eveningAvailable) {
                        slotInfo.innerHTML = '<small>Morning avail.<br>Evening booked</small>';
                    }
                    
                    contentContainer.appendChild(slotInfo);
                    dayElement.appendChild(contentContainer);
                } else {
                    // Simple availability (available/booked) - center the number
                    dayElement.textContent = day;
                    dayElement.classList.add(availability);
                    dayElement.style.display = 'flex';
                    dayElement.style.alignItems = 'center';
                    dayElement.style.justifyContent = 'center';
                }
                
                // Add click event only for valid dates
                dayElement.addEventListener('click', () => {
                    this.selectDate(date, dayElement, availability);
                });

                // Highlight today with a special border
                if (currentDate.getTime() === today.getTime()) {
                    dayElement.style.border = '3px solid #0ea5e9';
                    dayElement.style.boxShadow = '0 0 0 2px rgba(14, 165, 233, 0.3)';
                }
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    selectDate(date, element, availability) {
        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            alert('You cannot book for past dates. Please select today or a future date.');
            return;
        }

        // Remove previous selection
        const prevSelected = document.querySelector('.calendar-day.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }

        // Add selection to clicked day
        element.classList.add('selected');
        this.selectedDate = date;
        
        // Store availability info for the form
        this.selectedDateAvailability = availability;

        // Update form with selected date and availability
        console.log('Selected date:', date.toDateString());
        console.log('Date availability:', availability);
        
        // Update the form's time selection based on availability
        if (availability === 'booked') {
            // Fully booked - disable everything
            window.bookingForm.disableAllTimes();
            window.bookingForm.disableBookingButton();
        } else if (typeof availability === 'object' && availability.type === 'partial') {
            // Partially booked - disable specific slots
            window.bookingForm.updateTimeAvailability(availability);
            window.bookingForm.enableBookingButton();
        } else {
            // Available - enable everything
            window.bookingForm.enableAllTimes();
            window.bookingForm.enableBookingButton();
        }
        
        // Update the selected date display in the form
        this.updateSelectedDateDisplay(date);
    }

    updateSelectedDateDisplay(date) {
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');
        if (selectedDateDisplay) {
            if (date) {
                selectedDateDisplay.innerHTML = `
                    <div class="selected-date-info">
                        <div class="selected-date-day">${date.getDate()}</div>
                        <div class="selected-date-month-year">${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        <div class="selected-date-weekday">${date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                `;
                selectedDateDisplay.classList.add('has-date');
                selectedDateDisplay.classList.remove('no-date-selected');
            } else {
                selectedDateDisplay.innerHTML = '<span class="no-date-selected">Please select a date from the calendar</span>';
                selectedDateDisplay.classList.remove('has-date');
                selectedDateDisplay.classList.add('no-date-selected');
            }
        }
    }
}

// Form functionality
class BookingForm {
    constructor() {
        this.selectedTime = 'morning';
        this.timeAvailability = {
            morning: true,
            evening: true
        };
        this.init();
        // Initialize booking button as disabled (no date selected by default)
        this.disableBookingButton();
    }

    init() {
        this.bindEvents();
        this.updateTimeSelection();
    }

    bindEvents() {
        // Time tab switching
        const timeTabs = document.querySelectorAll('.time-tab');
        timeTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const clickedTab = e.target.closest('.time-tab');
                
                // Don't allow selection if tab is disabled
                if (clickedTab.disabled || clickedTab.classList.contains('disabled')) {
                    return;
                }
                
                timeTabs.forEach(t => t.classList.remove('active'));
                clickedTab.classList.add('active');
                this.selectedTime = clickedTab.dataset.time;
                this.updateTimeSelection();
            });
        });

        // Form submission
        const form = document.getElementById('bookingForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Phone number validation
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', (e) => {
            this.validatePhone(e.target);
        });

        // Location detection button
        const detectLocationBtn = document.getElementById('detectLocation');
        detectLocationBtn.addEventListener('click', () => {
            this.detectLocation();
        });

        // Location input paste handling
        const locationInput = document.getElementById('location');
        locationInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.processLocationInput(e.target.value);
            }, 100);
        });
    }

    updateTimeSelection() {
        console.log('Selected time slot:', this.selectedTime);
    }

    updateTimeAvailability(availability) {
        // Update availability based on calendar selection
        this.timeAvailability.morning = availability.morningAvailable;
        this.timeAvailability.evening = availability.eveningAvailable;
        
        // Update UI
        this.updateTimeTabsUI();
    }

    enableAllTimes() {
        this.timeAvailability.morning = true;
        this.timeAvailability.evening = true;
        this.updateTimeTabsUI();
    }

    updateTimeTabsUI() {
        const morningTab = document.querySelector('[data-time="morning"]');
        const eveningTab = document.querySelector('[data-time="evening"]');
        
        // Update morning tab
        if (this.timeAvailability.morning) {
            morningTab.classList.remove('disabled');
            morningTab.disabled = false;
            morningTab.style.opacity = '1';
            morningTab.style.cursor = 'pointer';
        } else {
            morningTab.classList.add('disabled');
            morningTab.disabled = true;
            morningTab.style.opacity = '0.5';
            morningTab.style.cursor = 'not-allowed';
            
            // If morning was selected, switch to evening if available
            if (this.selectedTime === 'morning' && this.timeAvailability.evening) {
                this.selectTimeTab('evening');
            }
        }
        
        // Update evening tab
        if (this.timeAvailability.evening) {
            eveningTab.classList.remove('disabled');
            eveningTab.disabled = false;
            eveningTab.style.opacity = '1';
            eveningTab.style.cursor = 'pointer';
        } else {
            eveningTab.classList.add('disabled');
            eveningTab.disabled = true;
            eveningTab.style.opacity = '0.5';
            eveningTab.style.cursor = 'not-allowed';
            
            // If evening was selected, switch to morning if available
            if (this.selectedTime === 'evening' && this.timeAvailability.morning) {
                this.selectTimeTab('morning');
            }
        }
        
        // If neither is available, show alert
        if (!this.timeAvailability.morning && !this.timeAvailability.evening) {
            alert('No time slots available for this date.');
        }
    }

    disableAllTimes() {
        this.timeAvailability.morning = false;
        this.timeAvailability.evening = false;
        this.updateTimeTabsUI();
    }

    disableBookingButton() {
        const submitBtn = document.querySelector('.book-ride-btn');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.style.background = 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)';
        submitBtn.innerHTML = '<span class="btn-icon">🚫</span>Date Fully Booked';
    }

    enableBookingButton() {
        const submitBtn = document.querySelector('.book-ride-btn');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)';
        submitBtn.innerHTML = '<span class="btn-icon">🚗</span>Book Your Ride';
    }

    selectTimeTab(time) {
        const timeTabs = document.querySelectorAll('.time-tab');
        timeTabs.forEach(tab => tab.classList.remove('active'));
        
        const selectedTab = document.querySelector(`[data-time="${time}"]`);
        if (selectedTab && !selectedTab.disabled) {
            selectedTab.classList.add('active');
            this.selectedTime = time;
            this.updateTimeSelection();
        }
    }

    validatePhone(input) {
        const value = input.value.replace(/\D/g, '');
        if (value.length <= 10) {
            input.value = value;
        } else {
            input.value = value.slice(0, 10);
        }
    }

    handleSubmit() {
        const formData = new FormData(document.getElementById('bookingForm'));
        const bookingData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            timeSlot: this.selectedTime,
            tripType: formData.get('tripType') === 'home-to-airport' ? 'Home to Airport' : 'Airport to Home',
            location: formData.get('location'),
            date: this.getSelectedDate()
        };

        // Validate required fields
        if (!bookingData.name || !bookingData.phone || !bookingData.location) {
            alert('Please fill in all required fields.');
            return;
        }

        if (bookingData.phone.length !== 10) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }

        // Validate that selected date is not in the past
        if (bookingData.date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(bookingData.date);
            selectedDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                alert('You cannot book for past dates. Please select today or a future date.');
                return;
            }
            
            // Validate that the selected time slot is available
            const calendar = window.calendar;
            const dateKey = calendar.formatDateKey(selectedDate);
            const availability = calendar.availabilityData[dateKey];
            
            if (typeof availability === 'object' && availability.type === 'partial') {
                if (bookingData.timeSlot === 'morning' && !availability.morningAvailable) {
                    alert('Morning slot is already booked for this date. Please select evening or choose another date.');
                    return;
                }
                if (bookingData.timeSlot === 'evening' && !availability.eveningAvailable) {
                    alert('Evening slot is already booked for this date. Please select morning or choose another date.');
                    return;
                }
            }
        }

        // Simulate booking submission
        this.submitBooking(bookingData);
    }

    getSelectedDate() {
        const selectedDay = document.querySelector('.calendar-day.selected');
        if (!selectedDay) {
            alert('Please select a date from the calendar.');
            return null;
        }
        
        const calendar = window.calendar;
        
        // Validate that the selected time slot is available
        if (calendar.selectedDateAvailability && typeof calendar.selectedDateAvailability === 'object' && calendar.selectedDateAvailability.type === 'partial') {
            if (this.selectedTime === 'morning' && !calendar.selectedDateAvailability.morningAvailable) {
                alert('Morning slot is already booked for this date. Please select evening or choose another date.');
                return null;
            }
            if (this.selectedTime === 'evening' && !calendar.selectedDateAvailability.eveningAvailable) {
                alert('Evening slot is already booked for this date. Please select morning or choose another date.');
                return null;
            }
        }
        
        return calendar.selectedDate;
    }

    submitBooking(data) {
        // Show loading state
        const submitBtn = document.querySelector('.book-ride-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Booking...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // Show success message
            this.showSuccessMessage(data);
            
            // Reset form
            document.getElementById('bookingForm').reset();
            
            // Reset calendar selection
            const selectedDay = document.querySelector('.calendar-day.selected');
            if (selectedDay) {
                selectedDay.classList.remove('selected');
            }
            
            // Reset selected date display
            const calendar = window.calendar;
            calendar.selectedDate = null;
            calendar.selectedDateAvailability = null;
            calendar.updateSelectedDateDisplay(null);
        }, 2000);
    }

    detectLocation() {
        const locationInput = document.getElementById('location');
        const detectBtn = document.getElementById('detectLocation');
        
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        // Show loading state
        const originalText = detectBtn.innerHTML;
        detectBtn.innerHTML = '<svg class="location-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg> Detecting...';
        detectBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
                
                locationInput.value = mapsLink;
                this.processLocationInput(mapsLink);
                
                // Reset button
                detectBtn.innerHTML = originalText;
                detectBtn.disabled = false;
            },
            (error) => {
                let errorMessage = 'Unable to detect your location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }
                alert(errorMessage);
                
                // Reset button
                detectBtn.innerHTML = originalText;
                detectBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    processLocationInput(value) {
        if (!value) return;

        // Check if it's a Google Maps link
        if (value.includes('google.com/maps') || value.includes('maps.app.goo.gl')) {
            // Extract coordinates from Google Maps URL
            const coordsMatch = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
                const lat = coordsMatch[1];
                const lng = coordsMatch[2];
                console.log(`Extracted coordinates: ${lat}, ${lng}`);
            }
        }
        
        // Check if it's coordinates (lat,lng format)
        const coordsMatch = value.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (coordsMatch && !value.includes('google.com/maps')) {
            const lat = coordsMatch[1];
            const lng = coordsMatch[2];
            const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
            console.log(`Converted coordinates to maps link: ${mapsLink}`);
        }
    }

    formatLocation(locationValue) {
        if (!locationValue) return 'Not specified';
        
        // If it's a Google Maps link, extract coordinates
        if (locationValue.includes('google.com/maps')) {
            const coordsMatch = locationValue.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
                return `Maps: ${coordsMatch[1]}, ${coordsMatch[2]}`;
            }
            return 'Google Maps Location';
        }
        
        // If it's coordinates, format them nicely
        const coordsMatch = locationValue.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (coordsMatch) {
            return `Coords: ${coordsMatch[1]}, ${coordsMatch[2]}`;
        }
        
        // If it's a regular address, return as is
        return locationValue;
    }

    showSuccessMessage(data) {
        const message = `
            Booking Confirmed!
            
            Name: ${data.name}
            Phone: ${data.phone}
            Date: ${data.date ? data.date.toDateString() : 'Not selected'}
            Time: ${data.timeSlot === 'morning' ? 'Morning (6:00 AM - 12:00 PM)' : 'Evening (12:00 PM - 10:00 PM)'}
            Trip Type: ${data.tripType}
            Location: ${this.formatLocation(data.location)}
            
            Thank you for booking with Raipur Airport ↔ Bhilai Travel Service!
        `;
        
        alert(message);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize calendar
    window.calendar = new Calendar();
    
    // Initialize booking form
    window.bookingForm = new BookingForm();
    
    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Add fade-in animation for elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    // Observe main containers for animation
    document.querySelectorAll('.calendar-container, .booking-form-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}
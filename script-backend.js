// Enhanced Frontend Script with Backend API Integration
class AirportBookingSystem {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3001/api';
        this.currentDate = new Date();
        this.selectedDate = null;
        this.availabilityData = {};
        this.vehicles = [];
        this.selectedVehicle = null;
        this.bookingData = {
            customerName: '',
            phoneNumber: '',
            date: '',
            timeSlot: '',
            tripType: '',
            pickupLocation: ''
        };
    }

    async init() {
        this.setupEventListeners();
        this.setupMonthNavigation(); // Set up navigation only once
        this.generateCalendar();
        await this.loadAvailability();
        await this.loadVehicles();
        const urlDate = new URLSearchParams(window.location.search).get('date');
        if (urlDate) {
            const parts = urlDate.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
                this.currentDate = new Date(d.getFullYear(), d.getMonth(), 1);
                this.generateCalendar();
                this.selectDate(d);
            }
        }
        this.updateSelectedDateDisplay();
        this.setupFormIntegration();
    }

    formatDateLocal(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    setupFormIntegration() {
        // Override form submission to use backend
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleBackendBooking();
            });
        }
    }


    async loadVehicles() {
        try {
            const resp = await fetch(`${this.API_BASE_URL}/vehicles`);
            const data = await resp.json();
            // Filter to only show active vehicles
            this.vehicles = (data.vehicles || []).filter(v => v.active === true);
            const sel = document.getElementById('vehicleSelect');
            const rateEl = document.getElementById('vehicleRateDisplay');
            const btn = document.getElementById('vehicleDropdown');
            const menu = document.getElementById('vehicleMenu');
            if (sel) sel.innerHTML = this.vehicles.map(v => `<option value="${v.id}" data-rate="${v.rate}" data-name="${v.name}">${v.name}</option>`).join('');
            if (menu && btn) {
                menu.innerHTML = this.vehicles.map(v => `
                    <div class="dropdown-option" role="option" data-id="${v.id}" data-rate="${v.rate}" data-name="${v.name}" tabindex="-1">
                        <span class="opt-name">${v.name}</span>
                        <span class="opt-rate">₹${Number(v.rate)}</span>
                    </div>
                `).join('');
                const setSelected = (v) => {
                    this.selectedVehicle = v;
                    btn.textContent = `${v.name}`;
                    btn.setAttribute('aria-expanded', 'false');
                    menu.classList.add('hidden');
                    if (rateEl) rateEl.textContent = `₹${Number(v.rate)}`;
                    if (sel) sel.value = v.id;
                };
                if (this.vehicles.length > 0) setSelected(this.vehicles[0]);
                btn.addEventListener('click', () => {
                    const expanded = btn.getAttribute('aria-expanded') === 'true';
                    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                    menu.classList.toggle('hidden');
                });
                menu.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const v = {
                            id: opt.getAttribute('data-id'),
                            name: opt.getAttribute('data-name'),
                            rate: parseFloat(opt.getAttribute('data-rate'))
                        };
                        setSelected(v);
                    });
                    opt.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') opt.click();
                    });
                });
                document.addEventListener('click', (e) => {
                    if (!menu.classList.contains('hidden')) {
                        if (!menu.contains(e.target) && e.target !== btn) {
                            btn.setAttribute('aria-expanded', 'false');
                            menu.classList.add('hidden');
                        }
                    }
                });
            }
        } catch (err) {
            this.vehicles = [];
        }
    }

    async handleBackendBooking() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        const bookButton = document.querySelector('.book-ride-btn');
        const originalText = bookButton.textContent;
        bookButton.disabled = true;
        bookButton.textContent = 'Processing...';

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
                this.showBanner('success', 'Booking confirmed');
                this.showBookingSuccess(result);
                this.resetForm();
                await this.loadAvailability(); // Refresh availability
            } else {
                const errorData = await response.json();
                let errorMessage = 'Booking failed';
                
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    // Validation errors from express-validator
                    errorMessage = errorData.errors.map(err => err.msg).join('\n');
                } else if (errorData.error) {
                    // Single error message
                    errorMessage = errorData.error;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showBanner('error', 'Booking failed: ' + error.message);
            bookButton.disabled = false;
            bookButton.textContent = originalText;
        }
    }

    collectFormData() {
        const tripType = this.getSelectedTripType();
        const pickupLocation = document.getElementById('location').value;
        
        return {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            email: 'customer@noemail.com', // Default email for customers who don't provide one
            pickupDate: this.getSelectedDate(),
            pickupTime: this.getSelectedTimeSlot(),
            tripType: tripType === 'home-to-airport' ? 'HOME_TO_AIRPORT' : 'AIRPORT_TO_HOME',
            pickupLocation: pickupLocation,
            dropoffLocation: tripType === 'home-to-airport' ? 'Raipur Airport' : pickupLocation,
            price: this.calculateAmount(),
            vehicleId: this.selectedVehicle ? this.selectedVehicle.id : null,
            vehicleName: this.selectedVehicle ? this.selectedVehicle.name : null,
            vehicleRate: this.selectedVehicle ? this.selectedVehicle.rate : null,
            
        };
    }

    validateFormData(data) {
        const errors = [];

        if (!data.name.trim()) {
            errors.push('Please enter your name');
        }

        if (!data.phone.trim()) {
            errors.push('Please enter your phone number');
        } else if (!/^\d{10}$/.test(data.phone)) {
            errors.push('Please enter a valid 10-digit phone number');
        }

        if (!data.pickupDate) {
            errors.push('Please select a date from the calendar');
        }

        if (!data.pickupTime) {
            errors.push('Please select a time slot (Morning/Evening)');
        }

        if (!data.tripType) {
            errors.push('Please select trip direction');
        }

        if (!data.pickupLocation.trim()) {
            errors.push('Please enter pickup location');
        }

        if (errors.length > 0) {
            this.showBanner('error', 'Please fix: ' + errors.join(' | '));
            return false;
        }

        return true;
    }

    getSelectedDate() {
        return this.selectedDate ? this.formatDateLocal(this.selectedDate) : null;
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
        if (this.selectedVehicle && this.selectedVehicle.rate) {
            return Number(this.selectedVehicle.rate);
        }
        return 500;
    }

    showBookingSuccess(result) {
        const booking = result.booking || {};
        const bookingNumber = booking.bookingNumber || booking.booking_number || '';
        const name = booking.name || '';
        const dateVal = booking.pickupDate || booking.pickup_date;
        const time = booking.pickupTime || booking.pickup_time || '';
        const tripRaw = booking.tripType || booking.trip_type || '';
        const trip = tripRaw ? String(tripRaw).replace('_', ' ') : '';
        const price = booking.price ?? '';
        const status = booking.status || '';
        const dateText = dateVal ? new Date(dateVal).toLocaleDateString() : '';
        this.showBanner('success', `Booking ${bookingNumber} confirmed for ${dateText} ${time}`);
    }

    showBanner(type, message) {
        const el = document.getElementById('notice');
        if (!el) return;
        el.classList.remove('hidden');
        el.classList.remove('success');
        el.classList.remove('error');
        el.classList.add('show');
        el.classList.add(type === 'success' ? 'success' : 'error');
        el.textContent = message;
        setTimeout(() => {
            el.classList.remove('show');
            el.classList.add('hidden');
        }, 4000);
    }

    resetForm() {
        // Reset form fields
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('location').value = '';
        
        // Reset radio buttons
        document.querySelectorAll('input[name="tripType"]').forEach(radio => {
            radio.checked = false;
        });
        
        // Reset time tabs
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Reset calendar selection
        this.selectedDate = null;
        this.updateSelectedDateDisplay();
        
        // Reset button
        const bookButton = document.querySelector('.book-ride-btn');
        bookButton.disabled = false;
        bookButton.textContent = 'Book Ride';
    }

    setupEventListeners() {
        // Location detection
        const detectBtn = document.getElementById('detectLocation');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }

        // Time slot selection - set default to morning
        const morningTab = document.querySelector('[data-time="morning"]');
        if (morningTab) {
            this.selectTimeSlot(morningTab);
        }

        // Time slot selection
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.selectTimeSlot(e.target.closest('.time-tab'));
            });
        });

        // Trip type selection - set default
        const homeToAirportRadio = document.querySelector('input[value="home-to-airport"]');
        if (homeToAirportRadio) {
            homeToAirportRadio.checked = true;
            this.bookingData.tripType = 'home_to_airport';
        }

        // Trip type selection
        document.querySelectorAll('input[name="tripType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.bookingData.tripType = e.target.value.replace('-', '_');
            });
        });
    }

    async loadAvailability() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/availability`);
            if (response.ok) {
                const availability = await response.json();
                this.availabilityData = availability.reduce((acc, item) => {
                    const morning = (item.morningAvailable ?? item.morning_available);
                    const evening = (item.eveningAvailable ?? item.evening_available);
                    const dateVal = item.date;
                    const dateObj = typeof dateVal === 'string' ? new Date(dateVal) : new Date(dateVal);
                    const dateKey = this.formatDateLocal(dateObj);
                    acc[dateKey] = {
                        morning: morning !== undefined ? morning : true,
                        evening: evening !== undefined ? evening : true
                    };
                    return acc;
                }, {});
                this.generateCalendar();
            } else {
                this.generateMockAvailability();
            }
        } catch (error) {
            console.error('Error loading availability:', error);
            this.generateMockAvailability();
        }
    }

    generateMockAvailability() {
        // Generate mock availability for the next 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = this.formatDateLocal(date);
            
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
        const monthYear = document.getElementById('monthYear');
        const calendarGrid = document.getElementById('calendarGrid');
        
        if (!monthYear || !calendarGrid) return;

        // Clear existing calendar days (keep weekdays)
        const existingDays = calendarGrid.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        monthYear.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const currentDay = new Date(year, month, day);
            const dateStr = this.formatDateLocal(currentDay);
            
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
            let statusText = '';
            
            if (!availability.morning && !availability.evening) {
                status = 'booked';
                statusText = 'Fully Booked';
            } else if (!availability.morning) {
                status = 'partial';
                statusText = 'Evening Available';
            } else if (!availability.evening) {
                status = 'partial';
                statusText = 'Morning Available';
            }

            dayElement.classList.add(status);
            dayElement.dataset.date = dateStr;
            
            dayElement.innerHTML = `
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-day-status">${statusText}</div>
            `;

            if (!isPastDate) {
                dayElement.setAttribute('role', 'gridcell');
                dayElement.setAttribute('tabindex', '0');
                dayElement.setAttribute('aria-label', `${currentDay.toDateString()} ${statusText || 'Available'}`);
                dayElement.addEventListener('click', () => {
                    this.selectDate(currentDay);
                });
                dayElement.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.selectDate(currentDay);
                    }
                });
            }

            calendarGrid.appendChild(dayElement);
        }
        
        // Don't call setupMonthNavigation here - it's already set up in init
    }

    setupMonthNavigation() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn && !prevBtn.hasAttribute('data-listener')) {
            prevBtn.setAttribute('data-listener', 'true');
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.generateCalendar();
            });
        }
        
        if (nextBtn && !nextBtn.hasAttribute('data-listener')) {
            nextBtn.setAttribute('data-listener', 'true');
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.generateCalendar();
            });
        }
    }

    selectDate(date) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });

        // Add selection to clicked date
        const dateStr = this.formatDateLocal(date);
        const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            dayElement.classList.add('selected');
            dayElement.setAttribute('aria-selected', 'true');
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

        const dateStr = this.formatDateLocal(this.selectedDate);
        const availability = this.availabilityData[dateStr] || { morning: true, evening: true };

        // Check if selected date is today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(this.selectedDate);
        selectedDate.setHours(0, 0, 0, 0);
        const isToday = selectedDate.getTime() === today.getTime();

        // Get current time
        const now = new Date();
        const currentHour = now.getHours();

        // Update morning tab
        const morningTab = document.querySelector('[data-time="morning"]');
        if (morningTab) {
            let morningAvailable = availability.morning;
            
            // If it's today and past 12 PM, disable morning
            if (isToday && currentHour >= 12) {
                morningAvailable = false;
            }
            
            if (!morningAvailable) {
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
            let eveningAvailable = availability.evening;
            
            // If it's today and past 6 PM, disable evening
            if (isToday && currentHour >= 18) {
                eveningAvailable = false;
            }
            
            if (!eveningAvailable) {
                eveningTab.classList.add('disabled');
                eveningTab.style.pointerEvents = 'none';
            } else {
                eveningTab.classList.remove('disabled');
                eveningTab.style.pointerEvents = 'auto';
            }
        }

        // If fully booked, disable booking button
        const bookButton = document.querySelector('.book-ride-btn');
        const finalMorningAvailable = isToday && currentHour >= 12 ? false : availability.morning;
        const finalEveningAvailable = isToday && currentHour >= 18 ? false : availability.evening;
        
        if (!finalMorningAvailable && !finalEveningAvailable) {
            bookButton.disabled = true;
            bookButton.textContent = 'Fully Booked';
        } else {
            bookButton.disabled = false;
            bookButton.textContent = 'Book Ride';
        }
    }

    selectTimeSlot(tabElement) {
        // Remove active class from all tabs
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to selected tab
        tabElement.classList.add('active');
        this.bookingData.timeSlot = tabElement.dataset.time;
    }

    async getCurrentLocation() {
        const detectBtn = document.getElementById('detectLocation');
        const locationInput = document.getElementById('location');
        
        if (!detectBtn || !locationInput) return;
        
        const originalText = detectBtn.innerHTML;
        detectBtn.innerHTML = '<svg class="location-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg> Getting location...';
        detectBtn.disabled = true;

        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const { latitude, longitude } = position.coords;
                const locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                
                locationInput.value = locationText;
                this.bookingData.pickupLocation = locationText;
                
                detectBtn.innerHTML = '<svg class="location-icon" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg> Location Found';
                setTimeout(() => {
                    detectBtn.innerHTML = originalText;
                    detectBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error getting location:', error);
                detectBtn.innerHTML = '<svg class="location-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg> Failed';
                setTimeout(() => {
                    detectBtn.innerHTML = originalText;
                    detectBtn.disabled = false;
                }, 2000);
            }
        } else {
            alert('Geolocation is not supported by your browser.');
            detectBtn.innerHTML = originalText;
            detectBtn.disabled = false;
        }
    }

    
}

// Initialize the booking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const bookingSystem = new AirportBookingSystem();
    bookingSystem.init().catch(error => {
        console.error('Failed to initialize booking system:', error);
    });
});
window.addEventListener('error', function(e){ try { var el=document.getElementById('notice'); if (el) { el.className='notice error'; el.textContent='Error: '+String(e.message||'unknown') } } catch(_){} });

// Enhanced Frontend Script with Backend API Integration
class AirportBookingSystem {
    constructor() {
        this.API_BASE_URL = `${window.location.origin}/api`;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.availabilityData = {};
        this._geoWatchId = null;
        this.bookingData = {
            customerName: '',
            phoneNumber: '',
            date: '',
            timeSlot: '',
            tripType: '',
            pickupLocation: '',
            flightNumber: ''
        };
        
        this.init();
    }

    formatDateLocal(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async init() {
        this.setupEventListeners();
        await this.loadVehicles();
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
        const defaultTripRadio = document.querySelector('input[name="tripType"]:checked');
        if (defaultTripRadio) {
            this.bookingData.tripType = defaultTripRadio.value;
        }

        // Location input with GPS detection
        const detectBtn = document.getElementById('detectLocation');
        if (detectBtn) {
            detectBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }

        // Input wiring to internal bookingData
        const nameInput = document.getElementById('name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.bookingData.customerName = e.target.value;
            });
        }

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.bookingData.phoneNumber = e.target.value;
            });
        }

        const locationInput = document.getElementById('location');
        if (locationInput) {
            locationInput.addEventListener('input', (e) => {
                this.bookingData.pickupLocation = e.target.value;
            });
        }
        const flightInput = document.getElementById('flightNumber');
        if (flightInput) {
            flightInput.addEventListener('input', (e) => {
                this.bookingData.flightNumber = e.target.value;
            });
        }
        const activeTab = document.querySelector('.time-tab.active');
        if (activeTab && activeTab.dataset.time) {
            this.bookingData.timeSlot = activeTab.dataset.time;
        }
        const vehicleDropdown = document.getElementById('vehicleDropdown');
        const vehicleMenu = document.getElementById('vehicleMenu');
        if (vehicleDropdown && vehicleMenu) {
            vehicleDropdown.addEventListener('click', async () => {
                const expanded = vehicleDropdown.getAttribute('aria-expanded') === 'true';
                if (!expanded) {
                    try {
                        const res = await fetch(`${this.API_BASE_URL}/vehicles`);
                        if (res.ok) {
                            const json = await res.json();
                            const vehicles = (json.vehicles || []).filter(v => v.active !== false);
                            this.populateVehicleOptions(vehicles);
                        }
                    } catch(_) {}
                }
                vehicleDropdown.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                vehicleMenu.classList.toggle('hidden', expanded);
            });

            document.addEventListener('click', (e) => {
                if (!vehicleDropdown.contains(e.target) && !vehicleMenu.contains(e.target)) {
                    vehicleDropdown.setAttribute('aria-expanded', 'false');
                    vehicleMenu.classList.add('hidden');
                }
            });
        }
    }

    async loadAvailability() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/availability`);
            if (response.ok) {
                const availability = await response.json();
                this.availabilityData = availability.reduce((acc, item) => {
                    const key = this.formatDateLocal(new Date(item.date));
                    const morning = item.morningAvailable ?? item.morning_available ?? true;
                    const evening = item.eveningAvailable ?? item.evening_available ?? true;
                    acc[key] = { morning: !!morning, evening: !!evening };
                    return acc;
                }, {});
                this.generateCalendar();
            }
        } catch (error) {
            try {
                const supabaseUrl = 'https://vkorkcyltikzfounowqh.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3JrY3lsdGlremZvdW5vd3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzE4MTEsImV4cCI6MjA3OTIwNzgxMX0.C6DYciv1Nmsnyby5PO1fMFGigOZ57O1kOhQbKyzm_PM';
                const params = new URLSearchParams({ select: '*' });
                const r2 = await fetch(`${supabaseUrl}/rest/v1/availability?${params.toString()}`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
                if (r2.ok) {
                    const rows = await r2.json();
                    this.availabilityData = rows.reduce((acc, item) => {
                        const key = this.formatDateLocal(new Date(item.date));
                        const morning = item.morningAvailable ?? item.morning_available ?? true;
                        const evening = item.eveningAvailable ?? item.evening_available ?? true;
                        acc[key] = { morning: !!morning, evening: !!evening };
                        return acc;
                    }, {});
                    this.generateCalendar();
                    return;
                }
                this.generateMockAvailability();
            } catch (e2) {
                this.generateMockAvailability();
            }
        }
    }

    async loadVehicles() {
        try {
            const res = await fetch(`${this.API_BASE_URL}/vehicles`);
            if (!res.ok) throw new Error('Failed to load vehicles');
            const json = await res.json();
            const vehicles = (json.vehicles || []).filter(v => v.active !== false);
            this.populateVehicleOptions(vehicles);
        } catch (err) {
            const fallback = [
                { id: 'sedan', name: 'Sedan', rate: 700 },
                { id: 'suv', name: 'SUV', rate: 900 },
                { id: 'van', name: 'Van', rate: 1100 }
            ];
            this.populateVehicleOptions(fallback);
        }
    }

    populateVehicleOptions(vehicles) {
        const menu = document.getElementById('vehicleMenu');
        const dropdownBtn = document.getElementById('vehicleDropdown');
        const nativeSelect = document.getElementById('vehicleSelect');
        const rateDisplay = document.getElementById('vehicleRateDisplay');
        let promosMap = new Map();
        (async () => {
            try {
                const pr = await fetch(`${this.API_BASE_URL}/promos`);
                const pj = pr.ok ? await pr.json() : { promos: [] };
                (pj.promos||[]).forEach(p => { if (/^VEH_/i.test(p.code||'')) { promosMap.set(String(p.code), p); } });
            } catch(_) {}
            if (!menu || !dropdownBtn) return;

            menu.innerHTML = '';
            vehicles.forEach(v => {
                const opt = document.createElement('div');
                opt.className = 'dropdown-option';
                opt.setAttribute('role', 'option');
                opt.setAttribute('data-id', v.id);
                opt.setAttribute('data-name', v.name);
                opt.setAttribute('data-rate', String(v.rate));
                const base = Number(v.rate);
                const builtInDisc = v.discounted_rate != null ? Number(v.discounted_rate) : null;
                const promo = promosMap.get('VEH_'+(v.id||''));
                const discounted = builtInDisc != null ? builtInDisc : (promo && promo.active ? Math.max(0, base - Number(promo.discount_flat||0)) : null);
                const rateLabel = discounted != null ? `<span class="opt-rate"><span class="rate-original">₹${base}</span> <span class="rate-discount">₹${discounted}</span></span>` : `<span class="opt-rate">₹${base}</span>`;
                opt.innerHTML = `<span>${v.name}</span>${rateLabel}`;
                opt.addEventListener('click', () => {
                    dropdownBtn.textContent = v.name;
                    dropdownBtn.setAttribute('aria-expanded', 'false');
                    menu.classList.add('hidden');
                    this.bookingData.vehicleId = v.id;
                    this.bookingData.vehicleName = v.name;
                    this.bookingData.vehicleRate = base;
                    const promoSel = promosMap.get('VEH_'+(v.id||''));
                    const builtInSel = v.discounted_rate != null ? Number(v.discounted_rate) : null;
                    const discountedSel = builtInSel != null ? builtInSel : (promoSel && promoSel.active ? Math.max(0, base - Number(promoSel.discount_flat||0)) : null);
                    this.bookingData.vehicleDiscountedRate = discountedSel || null;
                    if (rateDisplay) {
                        rateDisplay.innerHTML = discountedSel != null ? `<span class="rate-original">₹${base}</span> <span class="rate-discount">₹${discountedSel}</span>` : `₹${base}`;
                    }
                    if (nativeSelect) nativeSelect.value = v.id;
                });
                menu.appendChild(opt);
            });

            if (nativeSelect) {
                nativeSelect.innerHTML = '';
                vehicles.forEach(v => {
                    const o = document.createElement('option');
                    o.value = v.id;
                    const base = Number(v.rate);
                    const builtInDisc2 = v.discounted_rate != null ? Number(v.discounted_rate) : null;
                    const promo2 = promosMap.get('VEH_'+(v.id||''));
                    const disc2 = builtInDisc2 != null ? builtInDisc2 : (promo2 && promo2.active ? Math.max(0, base - Number(promo2.discount_flat||0)) : null);
                    o.textContent = disc2 != null ? `${v.name} (₹${base} → ₹${disc2})` : `${v.name} (₹${base})`;
                    nativeSelect.appendChild(o);
                });
                nativeSelect.addEventListener('change', (e) => {
                    const id = e.target.value;
                    const v = vehicles.find(x => String(x.id) === String(id));
                    if (v) {
                        dropdownBtn.textContent = v.name;
                        this.bookingData.vehicleId = v.id;
                        this.bookingData.vehicleName = v.name;
                        const base = Number(v.rate);
                        this.bookingData.vehicleRate = base;
                        const builtInSel2 = v.discounted_rate != null ? Number(v.discounted_rate) : null;
                        const promoSel2 = promosMap.get('VEH_'+(v.id||''));
                        const discountedSel2 = builtInSel2 != null ? builtInSel2 : (promoSel2 && promoSel2.active ? Math.max(0, base - Number(promoSel2.discount_flat||0)) : null);
                        this.bookingData.vehicleDiscountedRate = discountedSel2 || null;
                        if (rateDisplay) {
                            rateDisplay.innerHTML = discountedSel2 != null ? `<span class="rate-original">₹${base}</span> <span class="rate-discount">₹${discountedSel2}</span>` : `₹${base}`;
                        }
                    }
                });
            }
        })();
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
        const calendar = document.getElementById('calendarGrid');
        if (!calendar) return;
        calendar.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthLabel = document.getElementById('monthYear');
        if (monthLabel) {
            monthLabel.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'weekday';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
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
            calendar.appendChild(emptyCell);
        }

        // Calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const currentDay = new Date(year, month, day);
            const dateStr = this.formatDateLocal(currentDay);
            dayElement.setAttribute('data-date', dateStr);
            
            const isPastDate = currentDay < today;
            if (isPastDate) {
                dayElement.classList.add('past-date');
                dayElement.style.pointerEvents = 'none';
            }

            const availability = this.availabilityData[dateStr] || { morning: true, evening: true };
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
            const displayText = (!isPastDate && status === 'partial') ? String(statusText).replace(' ', '<br>') : (isPastDate ? '' : statusText);
            dayElement.innerHTML = `
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-day-status">${displayText}</div>
            `;

            if (!isPastDate) {
                dayElement.addEventListener('click', () => {
                    this.selectDate(currentDay);
                });
            }

            calendar.appendChild(dayElement);
        }

        // Month navigation (use existing buttons)
        const prev = document.getElementById('prevMonth');
        const next = document.getElementById('nextMonth');
        if (prev) prev.onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.generateCalendar(); };
        if (next) next.onclick = () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.generateCalendar(); };
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

    showNotice(type, text) {
        const el = document.getElementById('notice');
        if (!el) return;
        el.classList.remove('hidden', 'success', 'error');
        el.classList.add(type === 'error' ? 'error' : 'success', 'show');
        el.textContent = text;
        setTimeout(() => { try { el.classList.remove('show'); el.classList.add('hidden'); } catch(_){} }, 4000);
    }

    async tryIpLocation() {
        try {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) return false;
            const j = await r.json();
            const lat = Number(j.latitude);
            const lon = Number(j.longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                const locationText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                const locationInput = document.getElementById('location');
                if (locationInput) locationInput.value = locationText;
                this.bookingData.pickupLocation = locationText;
                this.showNotice('success', 'Approximate location captured');
                return true;
            }
        } catch(_) {}
        return false;
    }

    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
            const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!r.ok) return null;
            const j = await r.json();
            const name = j && (j.display_name || (j.address && (j.address.road || j.address.suburb || j.address.city || j.address.town)));
            return name || null;
        } catch(_) { return null; }
    }

    updateTimeSlotAvailability() {
        if (!this.selectedDate) return;

        const dateStr = this.formatDateLocal(this.selectedDate);
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

        // Auto-select default slot based on availability
        const currentSlot = this.bookingData.timeSlot;
        const currentTab = currentSlot ? document.querySelector(`[data-time="${currentSlot}"]`) : null;
        const isCurrentDisabled = currentTab ? currentTab.classList.contains('disabled') : true;
        const canMorning = !!availability.morning;
        const canEvening = !!availability.evening;
        if (!canMorning && !canEvening) {
            this.bookingData.timeSlot = '';
        } else if (isCurrentDisabled || !currentSlot) {
            document.querySelectorAll('.time-tab').forEach(tab => tab.classList.remove('active'));
            if (canMorning) {
                const tab = document.querySelector('[data-time="morning"]');
                if (tab) tab.classList.add('active');
                this.bookingData.timeSlot = 'morning';
            } else if (canEvening) {
                const tab = document.querySelector('[data-time="evening"]');
                if (tab) tab.classList.add('active');
                this.bookingData.timeSlot = 'evening';
            }
        }

        // If fully booked, disable booking button
        const bookButton = document.querySelector('.book-ride-btn');
        if (bookButton) {
            if (!availability.morning && !availability.evening) {
                bookButton.disabled = true;
                bookButton.textContent = 'Fully Booked';
            } else {
                bookButton.disabled = false;
                bookButton.textContent = 'Book Ride';
            }
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
        const locationBtn = document.getElementById('detectLocation');
        const locationInput = document.getElementById('location');
        
        const isSecure = (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        if (!isSecure) {
            this.showNotice('error', 'Location requires HTTPS. Open the site over https to use GPS.');
            return;
        }

        if (this._geoWatchId != null) {
            try { navigator.geolocation.clearWatch(this._geoWatchId); } catch(_) {}
            this._geoWatchId = null;
        }

        locationBtn.disabled = true;
        locationBtn.textContent = 'Getting location...';
        if (locationInput) locationInput.value = '';

        setTimeout(() => {
            try {
                if (locationBtn && locationBtn.disabled) {
                    locationBtn.disabled = false;
                    locationBtn.textContent = 'Get Current Location';
                }
            } catch(_) {}
        }, 20000);

        if (navigator.geolocation) {
            try {
                let permState = '';
                try {
                    const p = await navigator.permissions.query({ name: 'geolocation' });
                    permState = p && p.state ? p.state : '';
                } catch(_) {}
                if (permState === 'denied') {
                    this.showNotice('error', 'Location permission is blocked. Enable it in browser settings.');
                    locationBtn.textContent = 'Get Current Location';
                    locationBtn.disabled = false;
                    return;
                }

                const tryOnce = (opts) => new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
                });
                const watchForFix = (opts, ms = 8000) => new Promise((resolve, reject) => {
                    let timer;
                    const id = navigator.geolocation.watchPosition(pos => {
                        clearTimeout(timer);
                        try { navigator.geolocation.clearWatch(id); } catch(_){}
                        resolve(pos);
                    }, () => {}, opts);
                    timer = setTimeout(() => {
                        try { navigator.geolocation.clearWatch(id); } catch(_){}
                        reject(new Error('watch_timeout'));
                    }, ms);
                });
                const watchBestFix = (opts, ms = 20000, targetAcc = 10) => new Promise((resolve, reject) => {
                    let best = null;
                    let timer;
                    const id = navigator.geolocation.watchPosition(pos => {
                        if (!best || (pos.coords && pos.coords.accuracy < best.coords.accuracy)) {
                            best = pos;
                        }
                        if (pos.coords && pos.coords.accuracy <= targetAcc) {
                            clearTimeout(timer);
                            try { navigator.geolocation.clearWatch(id); } catch(_){ }
                            this._geoWatchId = null;
                            resolve(pos);
                        }
                    }, (err) => {
                        try { navigator.geolocation.clearWatch(id); } catch(_){ }
                        this._geoWatchId = null;
                    }, opts);
                    this._geoWatchId = id;
                    timer = setTimeout(() => {
                        try { navigator.geolocation.clearWatch(id); } catch(_){}
                        this._geoWatchId = null;
                        if (best) resolve(best); else reject(new Error('watch_timeout'));
                    }, ms);
                });

                let position;
                try {
                    position = await watchBestFix({ enableHighAccuracy: true, maximumAge: 0 }, 20000, 10);
                } catch (eWatch) {
                    try {
                        position = await tryOnce({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                    } catch (eTry) {
                        position = await tryOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
                    }
                }

                const { latitude, longitude, accuracy } = position.coords;
                const locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                if (locationInput) locationInput.value = locationText;
                this.bookingData.pickupLocation = locationText;
                this.showNotice('success', `Location captured (±${Math.round(accuracy||0)}m)`);
                locationBtn.textContent = 'Location Found';
                setTimeout(() => {
                    locationBtn.textContent = 'Get Current Location';
                    locationBtn.disabled = false;
                }, 1200);

            } catch (error) {
                let permDenied = false;
                try { permDenied = error && Number(error.code) === 1; } catch(_) {}
                if (permDenied) {
                    this.showNotice('error', 'Location permission denied. Enable it in browser settings.');
                } else {
                    const usedIp = await this.tryIpLocation();
                    if (!usedIp) {
                        this.showNotice('error', 'Unable to fetch location. Paste a Google Maps link or enter address.');
                    }
                }
                locationBtn.textContent = 'Location Failed';
                setTimeout(() => {
                    locationBtn.textContent = 'Get Current Location';
                    locationBtn.disabled = false;
                }, 2000);
            }
        } else {
            alert('Geolocation is not supported by your browser.');
            if (locationBtn) {
                locationBtn.disabled = false;
                locationBtn.textContent = 'Detect Location';
            }
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
        // Ensure last-minute defaults before validation
        if (!this.bookingData.timeSlot) {
            const dateStr = this.selectedDate ? this.formatDateLocal(this.selectedDate) : null;
            const avail = dateStr ? (this.availabilityData[dateStr] || { morning: true, evening: true }) : { morning: true, evening: true };
            if (avail.morning) {
                const tab = document.querySelector('[data-time="morning"]');
                if (tab) {
                    document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                }
                this.bookingData.timeSlot = 'morning';
            } else if (avail.evening) {
                const tab = document.querySelector('[data-time="evening"]');
                if (tab) {
                    document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                }
                this.bookingData.timeSlot = 'evening';
            }
        }
        if (!this.bookingData.tripType) {
            const defaultTripRadio = document.querySelector('input[name="tripType"]:checked');
            if (defaultTripRadio) this.bookingData.tripType = defaultTripRadio.value;
        }
        if (!this.bookingData.pickupLocation) {
            const locInput = document.getElementById('location');
            if (locInput) this.bookingData.pickupLocation = locInput.value;
        }

        const locVal = String(this.bookingData.pickupLocation || '').trim();
        const isLatLng = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(locVal);
        const isMapUrl = /^https?:\/\//i.test(locVal) && /google\.com\/maps|maps\.app\.goo\.gl/i.test(locVal);
        if (!isLatLng && !isMapUrl) {
            this.showNotice('error', 'Paste a Google Maps link or click Get Current Location to use coordinates');
            return;
        }

        const errors = this.validateForm();
        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return;
        }

        const bookButton = document.querySelector('.book-ride-btn');
        if (bookButton) {
            bookButton.disabled = true;
            bookButton.textContent = 'Processing...';
        }

        try {
            // Build payload for backend schema
            const tripEnum = this.bookingData.tripType === 'home-to-airport' ? 'HOME_TO_AIRPORT' : 'AIRPORT_TO_HOME';
            const userAddress = this.bookingData.pickupLocation;
            const pickupLocation = tripEnum === 'HOME_TO_AIRPORT' ? userAddress : 'Airport';
            const dropoffLocation = tripEnum === 'HOME_TO_AIRPORT' ? 'Airport' : userAddress;

            const payload = {
                name: this.bookingData.customerName,
                phone: this.bookingData.phoneNumber,
                pickupLocation,
                dropoffLocation,
                pickupDate: this.bookingData.date,
                pickupTime: this.bookingData.timeSlot,
                tripType: tripEnum,
                price: this.calculateAmount(),
                notes: ''
            };
            if (this.bookingData.vehicleId) payload.vehicleId = this.bookingData.vehicleId;
            if (this.bookingData.vehicleName) payload.vehicleName = this.bookingData.vehicleName;
            if (this.bookingData.vehicleRate) payload.vehicleRate = this.bookingData.vehicleRate;
            if (this.bookingData.flightNumber) payload.flightNumber = this.bookingData.flightNumber;

            const response = await fetch(`${this.API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const bookingObj = result && result.booking ? result.booking : result;
                this.handleSuccessfulBooking(bookingObj);
            } else {
                const error = await response.json();
                const msg = error.message || error.error || (Array.isArray(error.errors) ? (error.errors[0]?.msg || error.errors[0]) : null) || 'Booking failed';
                throw new Error(String(msg));
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Booking failed: ' + error.message);
            if (bookButton) {
                bookButton.disabled = false;
                bookButton.textContent = 'Book Ride';
            }
        }
    }

    calculateAmount() {
        const rate = Number(this.bookingData.vehicleRate || 500);
        const disc = Number(this.bookingData.vehicleDiscountedRate || 0);
        const final = disc>0 && disc<rate ? disc : rate;
        return Math.round(final);
    }

    handleSuccessfulBooking(booking) {
        const name = booking.name ?? booking.customerName ?? this.bookingData.customerName ?? '';
        const d = booking.pickup_date ?? booking.pickupDate ?? booking.date ?? this.bookingData.date ?? '';
        const t = booking.pickup_time ?? booking.pickupTime ?? booking.timeSlot ?? this.bookingData.timeSlot ?? '';
        const tripRaw = booking.trip_type ?? booking.tripType ?? this.bookingData.tripType ?? '';
        const amt = booking.price ?? booking.amount ?? this.calculateAmount();
        const id = booking.id ?? booking.bookingId ?? booking.booking_id ?? booking.booking_number ?? '';
        const tripNorm = (() => {
            const s = String(tripRaw || '').toUpperCase();
            if (s === 'HOME_TO_AIRPORT') return 'Home to Airport';
            if (s === 'AIRPORT_TO_HOME') return 'Airport to Home';
            if (s === 'HOME-TO-AIRPORT') return 'Home to Airport';
            if (s === 'AIRPORT-TO-HOME') return 'Airport to Home';
            return String(tripRaw || '').replace(/_/g, ' ').replace(/-/g, ' ');
        })();
        const dateText = d ? new Date(d).toLocaleDateString() : '';
        alert(`Booking confirmed!\n\n` +
              `Booking ID: ${id || '—'}\n` +
              `Customer: ${name || '—'}\n` +
              `Date: ${dateText || '—'}\n` +
              `Time: ${t || '—'}\n` +
              `Trip: ${tripNorm || '—'}\n` +
              `Amount: ₹${amt}\n\n` +
              `You will receive a confirmation email/SMS shortly.`);
        this.resetForm();
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
            pickupLocation: '',
            flightNumber: ''
        };

        // Reset form fields
        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        const locationInput = document.getElementById('location');
        const flightInput2 = document.getElementById('flightNumber');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (locationInput) locationInput.value = '';
        if (flightInput2) flightInput2.value = '';
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
        const bookButton = document.querySelector('.book-ride-btn');
        if (bookButton) {
            bookButton.disabled = false;
            bookButton.textContent = 'Book Ride';
        }
    }
}

// Initialize once, whether DOM is already loaded or not
if (!window.__AirportBookingSystemInit) {
    window.__AirportBookingSystemInit = true;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { new AirportBookingSystem(); });
    } else {
        new AirportBookingSystem();
    }
}
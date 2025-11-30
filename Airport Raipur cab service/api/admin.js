// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.bookings = [];
        this.drivers = [];
        this.availability = [];
        this.promos = [];
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        this.checkAuth();
        try { this.bindEvents(); } catch (e) {}
        await this.loadDashboardData();
        await this.loadVehicles();
        this.renderVehiclesTable();
        this.navigateToPage('dashboard');
    }

    checkAuth() {
        // Temporarily disable authentication: always show admin content
        this.currentUser = { role: 'ADMIN' };
        this.showAdminContent();
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('adminContent').style.display = 'none';
    }

    showAdminContent() {
        const ls = document.getElementById('loginSection');
        if (ls) ls.style.display = 'none';
        const ac = document.getElementById('adminContent');
        if (ac) ac.style.display = 'block';
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Booking actions
        document.addEventListener('click', (e) => {
            const btnView = e.target.closest('.view-booking');
            const btnEdit = e.target.closest('.edit-booking');
            const btnCancel = e.target.closest('.cancel-booking');
            const btnConfirm = e.target.closest('.confirm-booking');
            if (btnView) {
                e.preventDefault();
                this.viewBooking(btnView.dataset.id);
            } else if (btnEdit) {
                e.preventDefault();
                this.editBooking(btnEdit.dataset.id);
            } else if (btnCancel) {
                e.preventDefault();
                this.cancelBooking(btnCancel.dataset.id);
            } else if (btnConfirm) {
                e.preventDefault();
                this.confirmBooking(btnConfirm.dataset.id);
            }
        });

        // Driver actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-driver')) {
                this.editDriver(e.target.dataset.id);
            } else if (e.target.classList.contains('toggle-driver')) {
                this.toggleDriverStatus(e.target.dataset.id);
            } else if (e.target.classList.contains('delete-driver')) {
                this.deleteDriver(e.target.dataset.id);
            }
        });

        // Availability actions
        document.addEventListener('click', async (e) => {
            const action = e.target.getAttribute('data-action');
            const date = e.target.getAttribute('data-date');
            if (date) {
                const d = new Date(date); d.setHours(0,0,0,0);
                const today = new Date(); today.setHours(0,0,0,0);
                if (d < today) { this.showNotification('Cannot change past date availability', 'error'); return; }
            }
            if (e.target.classList.contains('edit-availability')) {
                await this.editAvailability(date);
            } else if (action === 'toggle-morning' && date) {
                const row = this.availability.find(a => new Date(a.date).toISOString() === new Date(date).toISOString());
                const next = !(row?.morningAvailable);
                await this.updateAvailability(date, { morningAvailable: next });
            } else if (action === 'toggle-evening' && date) {
                const row = this.availability.find(a => new Date(a.date).toISOString() === new Date(date).toISOString());
                const next = !(row?.eveningAvailable);
                await this.updateAvailability(date, { eveningAvailable: next });
            }
        });

        // Vehicles actions
        document.addEventListener('click', async (e) => {
            if (e.target && e.target.id === 'addVehicleBtn') {
                const nameEl = document.getElementById('vehicleNameInput');
                const rateEl = document.getElementById('vehicleRateInput');
                const name = (nameEl?.value || '').trim();
                const rate = parseFloat(rateEl?.value || '');
                if (!name || isNaN(rate)) return this.showNotification('Enter vehicle name and valid rate', 'error');
                await this.addVehicle(name, rate);
                if (nameEl) nameEl.value = '';
                if (rateEl) rateEl.value = '';
            } else if (e.target && e.target.classList.contains('edit-vehicle')) {
                const id = e.target.dataset.id;
                const newRate = parseFloat(prompt('Enter new rate (₹):') || '');
                if (isNaN(newRate)) return;
                await this.updateVehicle(id, { rate: newRate });
            } else if (e.target && e.target.classList.contains('toggle-vehicle')) {
                const id = e.target.dataset.id;
                const active = e.target.dataset.active === 'true';
                await this.updateVehicle(id, { active: !active });
            } else if (e.target && e.target.classList.contains('delete-vehicle')) {
                const id = e.target.dataset.id;
                if (!confirm('Delete vehicle?')) return;
                await this.deleteVehicle(id);
            }
        });

        



        // Modal events
        document.querySelectorAll('.modal-close, .cancel-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterBookingsByStatus(e.target.value);
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3001/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && (data.user.role === 'admin' || data.user.role === 'ADMIN')) {
                localStorage.setItem('adminToken', data.token);
                this.currentUser = data.user;
                this.showAdminContent();
                await this.loadDashboardData();
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification('Invalid credentials or insufficient permissions', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    handleLogout() {
        localStorage.removeItem('adminToken');
        this.currentUser = null;
        this.showLogin();
        this.showNotification('Logged out successfully', 'info');
    }

    async loadDashboardData() {
        try {
            // Load dashboard statistics from API
            const response = await fetch('http://localhost:3001/api/admin/dashboard');
            if (response.ok) {
                const data = await response.json();
                try {
                    this.updateDashboardData(data);
                } catch (e) {
                    console.error('Dashboard render error:', e);
                }
                this.bookings = data.recentBookings || [];
            } else {
                console.warn('Dashboard API responded non-OK:', response.status);
            }

            // Load additional data
            await Promise.all([
                this.loadBookings(),
                this.loadDrivers(),
                this.loadAvailability()
            ]);
            
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Do not interrupt; show empty dashboard gracefully
            this.bookings = this.bookings || [];
            this.drivers = this.drivers || [];
            this.availability = this.availability || [];
            this.updateDashboard();
        }
    }

    async loadBookings() {
        try {
            const response = await fetch('http://localhost:3001/api/admin/bookings?limit=200');
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.bookings || []);
            this.bookings = rows.map(b => ({
                id: b.id,
                customerName: b.name || b.customerName || '',
                phoneNumber: b.phone || b.phoneNumber || '',
                date: b.pickupDate || b.pickup_date || '',
                timeSlot: b.pickupTime || b.pickup_time || b.timeSlot || '',
                tripType: (b.tripType || b.trip_type || ''),
                pickupLocation: b.pickupLocation || b.pickup_location || '',
                amount: Number(b.price || b.amount || 0),
                status: (b.status || '').toLowerCase(),
                createdAt: b.createdAt || b.created_at || ''
            }));
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookings = [];
        }
    }

    async loadDrivers() {
        try {
            const response = await fetch('http://localhost:3001/api/drivers');
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.drivers || []);
            this.drivers = rows.map(d => ({
                id: d.id,
                name: d.name,
                email: d.email,
                phone: d.phone,
                vehicleNumber: d.vehicleNo || d.vehicle_no || d.vehicle,
                vehicleType: d.vehicle || '',
                isAvailable: (d.status || '').toUpperCase() === 'AVAILABLE'
            }));
        } catch (error) {
            console.error('Error loading drivers:', error);
            this.drivers = [];
        }
    }

    async loadAvailability() {
        try {
            const response = await fetch('http://localhost:3001/api/availability');
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.availability || []);
            this.availability = rows.map(a => ({
                date: a.date,
                morningAvailable: a.morningAvailable ?? a.morning_available,
                eveningAvailable: a.eveningAvailable ?? a.evening_available
            }));
        } catch (error) {
            console.error('Error loading availability:', error);
            this.availability = [];
        }
    }

    updateDashboard() {
        this.updateStatsCards();
        this.updateRecentBookings();
    }

    updateStatsCards() {
        const stats = this.calculateStats();
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('totalBookings', stats.totalBookings);
        setText('pendingBookings', stats.pendingBookings);
        setText('confirmedBookings', stats.confirmedBookings);
        setText('totalRevenue', `₹${Number(stats.totalRevenue || 0).toLocaleString()}`);
        setText('activeDrivers', stats.activeDrivers);
        this.updateNotifications(stats.pendingBookings);
    }

    updateDashboardData(data) {
        // Update dashboard with data from API
        if (data.statistics) {
            document.getElementById('totalBookings').textContent = data.statistics.totalBookings;
            document.getElementById('pendingBookings').textContent = data.statistics.pendingBookings;
            document.getElementById('todayRevenue').textContent = `₹${data.statistics.todayRevenue}`;
            document.getElementById('activeDrivers').textContent = data.statistics.totalDrivers;
            
            // Update notification badge and alert
            this.updateNotifications(data.statistics.pendingBookings);
        }
    }

    updateNotifications(pendingCount) {
        // Update badge
        const badge = document.getElementById('bookingsBadge');
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update alert
        const alert = document.getElementById('pendingBookingsAlert');
        const pendingCountSpan = document.getElementById('pendingCount');
        if (alert && pendingCountSpan) {
            if (pendingCount > 0) {
                pendingCountSpan.textContent = pendingCount;
                alert.classList.add('show');
            } else {
                alert.classList.remove('show');
            }
        }
    }

    calculateStats() {
        const toLower = s => (s || '').toLowerCase();
        const stats = {
            totalBookings: this.bookings.length,
            pendingBookings: this.bookings.filter(b => toLower(b.status) === 'pending').length,
            confirmedBookings: this.bookings.filter(b => toLower(b.status) === 'confirmed').length,
            totalRevenue: this.bookings
                .filter(b => ['confirmed','completed'].includes(toLower(b.status)))
                .reduce((sum, b) => sum + Number(b.price || b.amount || 0), 0),
            activeDrivers: this.drivers.filter(d => d.isAvailable).length
        };
        return stats;
    }

    updateRecentBookings() {
        const recentBookings = this.bookings
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const tbody = document.getElementById('recentBookingsBody');
        if (tbody) {
            tbody.innerHTML = recentBookings.map(b => {
                const dateText = b.date ? new Date(b.date).toLocaleDateString() : '';
                const timeText = b.timeSlot || '';
                const locText = b.pickupLocation || '';
                const status = (b.status || '').toLowerCase();
                return `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.customerName}</td>
                    <td>${dateText}</td>
                    <td>${timeText}</td>
                    <td>${locText}</td>
                    <td>${b.tripType}</td>
                    <td>
                        <span class="status-badge status-${status}">${status}</span>
                    </td>
                    <td>₹${b.amount}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-booking" data-id="${b.id}" title="View booking for ${dateText} ${timeText}">View</button>
                    </td>
                </tr>`
            }).join('');
        }
    }

    async navigateToPage(page) {
        this.currentPage = page;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page-content').forEach(content => {
            content.style.display = 'none';
        });

        // Show selected page
        document.getElementById(`${page}Page`).style.display = 'block';

        // Load page-specific data
        switch (page) {
            case 'bookings':
                this.loadBookingsPage();
                break;
            case 'drivers':
                this.loadDriversPage();
                break;
            case 'availability':
                this.loadAvailabilityPage();
                break;
            case 'vehicles':
                this.loadVehicles();
                this.renderVehiclesTable();
                break;
            
        }
    }

    async loadBookingsPage() {
        await this.loadBookings();
        this.renderBookingsTable();
    }

    renderBookingsTable() {
        const tbody = document.getElementById('bookingsTableBody');
        if (tbody) {
            tbody.innerHTML = this.bookings.map(b => {
                const status = (b.status || '').toLowerCase();
                const created = b.createdAt || b.created_at;
                const dateText = b.date
                    ? new Date(b.date).toLocaleDateString()
                    : (b.pickup_date ? new Date(b.pickup_date).toLocaleDateString() : '');
                const timeText = b.timeSlot || b.pickup_time || b.pickupTime || '';
                return `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.name || b.customerName || ''}</td>
                    <td>${dateText}</td>
                    <td>${timeText}</td>
                    <td>${(b.tripType || '').replace('_',' ')}</td>
                    <td>${b.pickupLocation || ''}</td>
                    <td>
                        <span class="status-badge status-${status}">
                            ${status}
                        </span>
                    </td>
                    <td>₹${Number(b.price || b.amount || 0)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary view-booking" data-id="${b.id}" title="View booking for ${dateText} ${timeText}" onclick="adminPanel && adminPanel.viewBooking('${b.id}')">View</button>
                            <button class="btn btn-sm btn-warning edit-booking" data-id="${b.id}" title="Edit booking for ${dateText} ${timeText}" onclick="adminPanel && adminPanel.editBooking('${b.id}')">Edit</button>
                            ${status === 'pending' ? `<button class="btn btn-sm btn-success confirm-booking" data-id="${b.id}" title="Confirm booking for ${dateText} ${timeText}" onclick="adminPanel && adminPanel.confirmBooking('${b.id}')">Confirm</button>` : ''}
                            ${status !== 'cancelled' ? `<button class="btn btn-sm btn-danger cancel-booking" data-id="${b.id}" onclick="adminPanel && adminPanel.cancelBooking('${b.id}')">Cancel</button>` : ''}
                        </div>
                    </td>
                </tr>`
            }).join('');
        }
    }

    async loadDriversPage() {
        await this.loadDrivers();
        this.renderDriversTable();
    }

    renderDriversTable() {
        const tbody = document.getElementById('driversTableBody');
        if (tbody) {
            tbody.innerHTML = this.drivers.map(driver => `
                <tr>
                    <td>${driver.id}</td>
                    <td>${driver.name}</td>
                    <td>${driver.email}</td>
                    <td>${driver.phone}</td>
                    <td>${driver.vehicleNumber}</td>
                    <td>${driver.vehicleType}</td>
                    <td>
                        <span class="status-badge status-${driver.isAvailable ? 'available' : 'unavailable'}">
                            ${driver.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-driver" data-id="${driver.id}">Edit</button>
                            <button class="btn btn-sm btn-warning toggle-driver" data-id="${driver.id}">${driver.isAvailable ? 'Mark Unavailable' : 'Mark Available'}</button>
                            <button class="btn btn-sm btn-danger delete-driver" data-id="${driver.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    async loadAvailabilityPage() {
        await this.loadAvailability();
        this.renderAvailabilityTable();
    }

    async loadVehicles() {
        try {
            const resp = await fetch('http://localhost:3001/api/vehicles');
            const data = await resp.json();
            this.vehicles = data.vehicles || [];
        } catch (err) {
            this.vehicles = [];
        }
    }

    



    async addVehicle(name, rate) {
        try {
            const resp = await fetch('http://localhost:3001/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rate })
            });
            if (resp.ok) {
                await this.loadVehicles();
                this.renderVehiclesTable();
                this.showNotification('Vehicle added', 'success');
            } else {
                this.showNotification('Failed to add vehicle', 'error');
            }
        } catch (err) {
            this.showNotification('Error adding vehicle', 'error');
        }
    }

    async updateVehicle(id, update) {
        try {
            const resp = await fetch(`http://localhost:3001/api/vehicles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            });
            if (resp.ok) {
                await this.loadVehicles();
                this.renderVehiclesTable();
                this.showNotification('Vehicle updated', 'success');
            } else {
                this.showNotification('Failed to update vehicle', 'error');
            }
        } catch (err) {
            this.showNotification('Error updating vehicle', 'error');
        }
    }

    async deleteVehicle(id) {
        try {
            const resp = await fetch(`http://localhost:3001/api/vehicles/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                await this.loadVehicles();
                this.renderVehiclesTable();
                this.showNotification('Vehicle deleted', 'success');
            } else {
                this.showNotification('Failed to delete vehicle', 'error');
            }
        } catch (err) {
            this.showNotification('Error deleting vehicle', 'error');
        }
    }

    renderVehiclesTable() {
        const tbody = document.getElementById('vehiclesTableBody');
        if (!tbody) return;
        tbody.innerHTML = (this.vehicles || []).map(v => `
            <tr>
                <td>${v.name}</td>
                <td>₹${Number(v.rate)}</td>
                <td>${v.active ? 'Active' : 'Inactive'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-warning edit-vehicle" data-id="${v.id}">Edit Rate</button>
                        <button class="btn btn-sm btn-secondary toggle-vehicle" data-id="${v.id}" data-active="${v.active}">${v.active ? 'Disable' : 'Enable'}</button>
                        <button class="btn btn-sm btn-danger delete-vehicle" data-id="${v.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderAvailabilityTable() {
        const tbody = document.getElementById('availabilityTableBody');
        if (tbody) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const rows = (this.availability || []).filter(a => {
                const d = new Date(a.date);
                d.setHours(0,0,0,0);
                return d >= today;
            });
            tbody.innerHTML = rows.map(a => `
                <tr>
                    <td>${new Date(a.date).toLocaleDateString()}</td>
                    <td>
                        <span class="availability-status ${a.morningAvailable ? 'available' : 'unavailable'}">
                            ${a.morningAvailable ? 'Available' : 'Booked'}
                        </span>
                    </td>
                    <td>
                        <span class="availability-status ${a.eveningAvailable ? 'available' : 'unavailable'}">
                            ${a.eveningAvailable ? 'Available' : 'Booked'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-availability" data-date="${a.date}">Edit</button>
                        <button class="btn btn-sm btn-success" data-action="toggle-morning" data-date="${a.date}">${a.morningAvailable ? 'Close Morning' : 'Open Morning'}</button>
                        <button class="btn btn-sm btn-warning" data-action="toggle-evening" data-date="${a.date}">${a.eveningAvailable ? 'Close Evening' : 'Open Evening'}</button>
                    </td>
                </tr>
            `).join('');
        }
    }


    async updateAvailability(date, update) {
        try {
            const iso = new Date(date).toISOString();
            const resp = await fetch(`http://localhost:3001/api/availability/${iso}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            });
            const result = await resp.json();
            if (resp.ok) {
                await this.loadAvailability();
                this.renderAvailabilityTable();
                this.showNotification('Availability updated', 'success');
            } else {
                this.showNotification(result.error || 'Failed to update availability', 'error');
            }
        } catch (err) {
            console.error('Availability update error:', err);
            this.showNotification('Availability update failed', 'error');
        }
    }

    async editAvailability(date) {
        const morning = confirm('Toggle morning availability? OK=toggle, Cancel=skip');
        if (morning) await this.updateAvailability(date, { morningAvailable: undefined });
        const evening = confirm('Toggle evening availability? OK=toggle, Cancel=skip');
        if (evening) await this.updateAvailability(date, { eveningAvailable: undefined });
    }

    viewBooking(bookingId) {
        const booking = this.bookings.find(b => String(b.id) === String(bookingId));
        if (!booking) { this.showNotification('Booking not found', 'error'); return; }

        const dateStr = booking.date || booking.pickup_date || '';
        const dateText = dateStr ? new Date(dateStr).toLocaleDateString() : '';
        const timeText = booking.timeSlot || booking.pickup_time || '';
        const tripText = (booking.tripType || booking.trip_type || '').replace('_',' ');
        const createdStr = booking.createdAt || booking.created_at || '';
        const createdText = createdStr ? new Date(createdStr).toLocaleDateString() : '';
        const amountNum = Number(booking.amount || booking.price || 0);

        const body = document.getElementById('bookingDetailsBody');
        const modal = document.getElementById('bookingDetailsModal');
        if (!body || !modal) return;
        body.innerHTML = `
            <div><strong>ID:</strong> ${booking.id}</div>
            <div><strong>Customer:</strong> ${booking.customerName || booking.name || ''}</div>
            <div><strong>Phone:</strong> ${booking.phoneNumber || booking.phone || ''}</div>
            <div><strong>Date:</strong> ${dateText}</div>
            <div><strong>Time:</strong> ${timeText}</div>
            <div><strong>Trip:</strong> ${tripText}</div>
            <div><strong>Location:</strong> ${booking.pickupLocation || booking.pickup_location || ''}</div>
            <div><strong>Amount:</strong> ₹${amountNum}</div>
            <div><strong>Status:</strong> ${(booking.status || '')}</div>
            <div><strong>Created:</strong> ${createdText}</div>
        `;
        modal.style.display = 'flex';
    }

    editBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const newStatus = prompt('Update booking status (pending/confirmed/completed/cancelled):', booking.status);
        if (newStatus && newStatus !== booking.status) {
            this.updateBookingStatus(bookingId, newStatus);
        }
    }

    async updateBookingStatus(bookingId, status) {
        try {
            const response = await fetch(`http://localhost:3001/api/admin/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: (status || '').toUpperCase() })
            });

            if (response.ok) {
                this.showNotification('Booking status updated successfully', 'success');
                const target = this.bookings.find(b => String(b.id) === String(bookingId));
                if (target) { target.status = (status || '').toLowerCase(); }
                this.renderBookingsTable();
                await this.loadBookings();
                this.renderBookingsTable();
                try { await this.loadDashboardData(); } catch(_) {}
            } else {
                this.showNotification('Failed to update booking status', 'error');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showNotification('Error updating booking status', 'error');
        }
    }

    async confirmBooking(bookingId) {
        if (!confirm('Are you sure you want to confirm this booking?')) return;

        await this.updateBookingStatus(bookingId, 'CONFIRMED');
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        await this.updateBookingStatus(bookingId, 'CANCELLED');
    }

    editDriver(driverId) {
        const driver = this.drivers.find(d => d.id === driverId);
        if (!driver) return;

        const newName = prompt('Update driver name:', driver.name);
        if (newName && newName !== driver.name) {
            this.updateDriver(driverId, { name: newName });
        }
    }

    async updateDriver(driverId, updates) {
        try {
            const response = await fetch(`http://localhost:3001/api/drivers/${driverId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                this.showNotification('Driver updated successfully', 'success');
                await this.loadDrivers();
                this.renderDriversTable();
            } else {
                this.showNotification('Failed to update driver', 'error');
            }
        } catch (error) {
            console.error('Error updating driver:', error);
            this.showNotification('Error updating driver', 'error');
        }
    }

    async toggleDriverStatus(driverId) {
        const driver = this.drivers.find(d => d.id === driverId);
        if (!driver) return;

        const nextStatus = driver.isAvailable ? 'OFFLINE' : 'AVAILABLE';
        try {
            const response = await fetch(`http://localhost:3001/api/drivers/${driverId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            if (response.ok) {
                this.showNotification('Driver status updated', 'success');
                await this.loadDrivers();
                this.renderDriversTable();
            } else {
                this.showNotification('Failed to update driver status', 'error');
            }
        } catch (err) {
            console.error('Driver status error:', err);
            this.showNotification('Error updating driver status', 'error');
        }
    }

    async deleteDriver(driverId) {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        try {
            const headers = {};
            if (this.currentUser && this.currentUser.token) {
                headers['Authorization'] = `Bearer ${this.currentUser.token}`;
            }
            const response = await fetch(`http://localhost:3001/api/drivers/${driverId}`, {
                method: 'DELETE',
                headers
            });
            if (response.ok) {
                this.showNotification('Driver deleted successfully', 'success');
                await this.loadDrivers();
                this.renderDriversTable();
            } else {
                let msg = 'Failed to delete driver';
                try { const data = await response.json(); if (data && data.error) msg = data.error; } catch (_) {}
                this.showNotification(msg, 'error');
            }
        } catch (error) {
            this.showNotification('Error deleting driver', 'error');
        }
    }

    handleSearch(query) {
        if (!query) {
            this.renderBookingsTable();
            return;
        }

        const filteredBookings = this.bookings.filter(booking => 
            booking.customerName.toLowerCase().includes(query.toLowerCase()) ||
            booking.phoneNumber.includes(query) ||
            booking.id.toString().includes(query)
        );

        this.renderFilteredBookings(filteredBookings);
    }

    filterBookingsByStatus(status) {
        if (!status) {
            this.renderBookingsTable();
            return;
        }

        const filteredBookings = this.bookings.filter(booking => 
            booking.status === status
        );

        this.renderFilteredBookings(filteredBookings);
    }

    renderFilteredBookings(filteredBookings) {
        const tbody = document.getElementById('bookingsTableBody');
        if (tbody) {
            tbody.innerHTML = filteredBookings.map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.customerName}</td>
                    <td>${new Date(booking.date).toLocaleDateString()}</td>
                    <td>${booking.timeSlot}</td>
                    <td>${booking.tripType}</td>
                    <td>${booking.pickupLocation}</td>
                    <td>
                        <span class="status-badge status-${booking.status}">
                            ${booking.status}
                        </span>
                    </td>
                    <td>₹${booking.amount}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary view-booking" data-id="${booking.id}">
                                View
                            </button>
                            <button class="btn btn-sm btn-warning edit-booking" data-id="${booking.id}">
                                Edit
                            </button>
                            ${booking.status === 'pending' ? `
                                <button class="btn btn-sm btn-success confirm-booking" data-id="${booking.id}">
                                    Confirm
                                </button>
                            ` : ''}
                            ${booking.status !== 'cancelled' ? `
                                <button class="btn btn-sm btn-danger cancel-booking" data-id="${booking.id}">
                                    Cancel
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showNotification(message, type) {
        // Simple notification using alert for now
        // In a real app, you'd want a proper notification system
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

if (!window.__adminInitDone) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.__adminInitDone) {
                window.__adminInitDone = true;
                window.adminPanel = new AdminPanel();
            }
        });
    } else {
        window.__adminInitDone = true;
        window.adminPanel = new AdminPanel();
    }
}

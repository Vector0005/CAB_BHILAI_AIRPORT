function extractCoords(loc){ var s=String(loc||'').trim(); if(!s) return ''; if(/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(s)){ var p=s.split(','); var la=parseFloat(p[0]); var ln=parseFloat(p[1]); if(isFinite(la)&&isFinite(ln)) return la.toFixed(6)+','+ln.toFixed(6); } if(/^https?:\/\//i.test(s)){ try{ var u=new URL(s); var q=u.searchParams.get('q'); if(q && /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(q)){ var pr=q.split(','); var la=parseFloat(pr[0]); var ln=parseFloat(pr[1]); if(isFinite(la)&&isFinite(ln)) return la.toFixed(6)+','+ln.toFixed(6); } }catch(_){ } var at=s.indexOf('@'); if(at>0){ var seg=s.substring(at+1).split(/[\?\s]/)[0]; var parts=seg.split(','); if(parts.length>=2){ var la=parseFloat(parts[0]); var ln=parseFloat(parts[1]); if(isFinite(la)&&isFinite(ln)) return la.toFixed(6)+','+ln.toFixed(6); } } } return s; }
// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.bookings = [];
        this.drivers = [];
        this.availability = [];
        this.promos = [];
        this.currentPage = 'dashboard';
        this.API_BASE_URL = window.location.origin + '/api';
        
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
        const t = localStorage.getItem('adminToken');
        if (!t) { this.showLogin(); return; }
        fetch(`${this.API_BASE_URL}/users/profile`, { headers: { Authorization: `Bearer ${t}` }})
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => { if (d && d.user && (String(d.user.role).toUpperCase()==='ADMIN')) { this.currentUser = d.user; this.showAdminContent(); } else { this.showLogin(); } })
            .catch(() => { this.showLogin(); });
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
                const discEl = document.getElementById('vehicleDiscountRateInput');
                const name = (nameEl?.value || '').trim();
                const rate = parseFloat(rateEl?.value || '');
                const disc = parseFloat(discEl?.value || '');
                if (!name || isNaN(rate)) return this.showNotification('Enter vehicle name and valid rate', 'error');
                await this.addVehicle(name, rate, (!isNaN(disc) && disc > 0 && disc < rate) ? disc : undefined);
                if (nameEl) nameEl.value = '';
                if (rateEl) rateEl.value = '';
                if (discEl) discEl.value = '';
            } else if (e.target && e.target.classList.contains('edit-vehicle')) {
                const id = e.target.dataset.id;
                const newRate = parseFloat(prompt('Enter new actual rate (₹):') || '');
                if (isNaN(newRate)) return;
                const discRate = parseFloat(prompt('Enter discounted rate (₹), leave blank to remove:') || '');
                await this.updateVehicle(id, { rate: newRate, discounted_rate: (!isNaN(discRate) && discRate > 0 && discRate < newRate) ? discRate : null });
                await this.loadVehicles();
                this.renderVehiclesTable();
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

        const lb = document.getElementById('loginButton');
        if (lb) { lb.addEventListener('click', (e) => { e.preventDefault(); this.handleLogin(); }); }
        const lo = document.getElementById('logoutBtn');
        if (lo) { lo.addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); }); }
        const gr = document.getElementById('generateReportBtn');
        if (gr) { gr.addEventListener('click', (e) => { e.preventDefault(); const sel = document.getElementById('reportRange'); const days = sel ? parseInt(sel.value||'7') : 7; this.loadReportsPage(days); }); }
        const rr = document.getElementById('reportRange');
        if (rr) { rr.addEventListener('change', (e) => { const days = parseInt(e.target.value||'7'); this.loadReportsPage(days); }); }
    }

    authFetch(url, options = {}) {
        const t = localStorage.getItem('adminToken');
        const h = Object.assign({}, options.headers || {}, t ? { Authorization: `Bearer ${t}` } : {});
        return fetch(url, Object.assign({}, options, { headers: h }));
    }

    async handleLogin() {
        if (window.__loginGate === true) return;
        window.__loginGate = true;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${this.API_BASE_URL}/users/login`, {
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
                this.navigateToPage('dashboard');
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification('Invalid credentials or insufficient permissions', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        } finally { window.__loginGate = false; }
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
            const response = await this.authFetch(`${this.API_BASE_URL}/admin/dashboard`);
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
            this.showNotification('Error loading dashboard data', 'error');
            this.updateDashboard();
        }
    }

    async loadBookings() {
        try {
            const response = await this.authFetch(`${this.API_BASE_URL}/admin/bookings?limit=200`);
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.bookings || []);
            this.bookings = rows.map(b => ({
                id: b.id,
                customerName: b.name || b.customerName || '',
                phoneNumber: b.phone || b.phoneNumber || '',
                date: b.pickupDate || b.pickup_date || '',
                timeSlot: b.pickupTime || b.pickup_time || b.timeSlot || '',
                tripType: String(b.tripType || b.trip_type || '').toUpperCase(),
                pickupLocation: b.pickupLocation || b.pickup_location || '',
                dropoffLocation: b.dropoffLocation || b.dropoff_location || '',
                flightNumber: b.flight_number || b.flightNumber || '',
                amount: Number(b.price || b.amount || 0),
                status: (b.status || '').toLowerCase(),
                createdAt: b.createdAt || b.created_at || ''
            }));
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookings = this.bookings || [];
        }
    }

    async loadDrivers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/drivers`);
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
            this.drivers = this.drivers || [];
        }
    }

    async loadAvailability() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/availability`);
            const data = await response.json();
            const rows = Array.isArray(data) ? data : (data.availability || []);
            this.availability = rows.map(a => ({
                date: a.date,
                morningAvailable: a.morningAvailable ?? a.morning_available,
                eveningAvailable: a.eveningAvailable ?? a.evening_available
            }));
        } catch (error) {
            console.error('Error loading availability:', error);
            this.availability = this.availability || [];
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
        const today = new Date(); today.setHours(0,0,0,0);
        const upcomingBookings = (this.bookings || [])
            .filter(b => {
                const d = b.date || b.pickup_date;
                if (!d) return false;
                const dt = new Date(d);
                const status = (b.status || '').toLowerCase();
                if (['cancelled','completed'].includes(status)) return false;
                return dt >= today;
            })
            .sort((a, b) => new Date(a.date || a.pickup_date) - new Date(b.date || b.pickup_date))
            .slice(0, 5);

        const tbody = document.getElementById('recentBookingsBody');
        if (tbody) {
            tbody.innerHTML = upcomingBookings.map(b => {
                const dateText = b.date ? new Date(b.date).toLocaleDateString() : '';
                const timeText = b.timeSlot || '';
                const tripUpper = String(b.tripType||'').toUpperCase();
                const locText = extractCoords(tripUpper==='AIRPORT_TO_HOME' ? (b.dropoffLocation||'') : (b.pickupLocation||''));
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
            case 'reports':
                this.loadReportsPage();
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
                const tripUpper = String(b.tripType || '').toUpperCase();
                const customerLoc = tripUpper==='AIRPORT_TO_HOME' ? (b.dropoffLocation || '') : (b.pickupLocation || '');
                return `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.name || b.customerName || ''}</td>
                    <td>${dateText}</td>
                    <td>${timeText}</td>
                    <td>${(b.tripType || '').replace('_',' ')}</td>
                    <td>${extractCoords(customerLoc)}</td>
                    <td>${b.flightNumber || b.flight_number || ''}</td>
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
            const [vr, pr] = await Promise.all([
                fetch(`${this.API_BASE_URL}/vehicles`),
                fetch(`${this.API_BASE_URL}/promos`)
            ]);
            const vj = vr.ok ? await vr.json() : { vehicles: [] };
            const pj = pr.ok ? await pr.json() : { promos: [] };
            this.vehicles = vj.vehicles || [];
            this.promos = pj.promos || [];
        } catch (err) {
            this.vehicles = this.vehicles || [];
            this.promos = this.promos || [];
        }
    }

    



    async addVehicle(name, rate, discountedRate) {
        try {
            const resp = await fetch(`${this.API_BASE_URL}/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rate, discounted_rate: discountedRate })
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
            const resp = await fetch(`${this.API_BASE_URL}/vehicles/${id}`, {
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
            const resp = await fetch(`${this.API_BASE_URL}/vehicles/${id}`, { method: 'DELETE' });
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
        const map = new Map();
        (this.promos || []).forEach(p => { const c = String(p.code || ''); if (/^VEH_/i.test(c)) map.set(c, p); });
        tbody.innerHTML = (this.vehicles || []).map(v => {
            const base = Number(v.rate || v.vehicle_rate || 0);
            const promo = map.get('VEH_' + (v.id || v.vehicle_id || ''));
            const builtInDisc = v.discounted_rate != null ? Number(v.discounted_rate) : null;
            const disc = builtInDisc != null ? builtInDisc : (promo && promo.active ? Math.max(0, base - Number(promo.discount_flat || 0)) : null);
            return `
            <tr>
                <td>${v.name || ''}</td>
                <td>₹${base}</td>
                <td>${disc != null ? '₹' + disc : '—'}</td>
                <td><span class="status-badge status-${v.active ? 'available' : 'unavailable'}">${v.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-warning edit-vehicle" data-id="${v.id}">Edit Rates</button>
                        <button class="btn btn-sm ${v.active ? 'btn-disable' : 'btn-enable'} toggle-vehicle" data-id="${v.id}" data-active="${v.active}">${v.active ? '⏸️ Disable' : '✅ Enable'}</button>
                        <button class="btn btn-sm btn-danger delete-vehicle" data-id="${v.id}">Delete</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
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
            const resp = await fetch(`${this.API_BASE_URL}/availability/${iso}`, {
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
            <div><strong>Location (coords):</strong> ${extractCoords(((String(booking.tripType||'').toUpperCase()==='AIRPORT_TO_HOME') ? (booking.dropoffLocation||booking.dropoff_location||'') : (booking.pickupLocation||booking.pickup_location||'')))}</div>
            <div><strong>Flight Number:</strong> ${booking.flightNumber || booking.flight_number || ''}</div>
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
            const response = await fetch(`${this.API_BASE_URL}/admin/bookings/${bookingId}/status`, {
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
            const response = await fetch(`${this.API_BASE_URL}/drivers/${driverId}`, {
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
            const response = await fetch(`${this.API_BASE_URL}/drivers/${driverId}/status`, {
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
            const response = await fetch(`${this.API_BASE_URL}/drivers/${driverId}`, {
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
                    <td>${extractCoords((String(booking.tripType||'').toUpperCase()==='AIRPORT_TO_HOME' ? (booking.dropoffLocation||'') : (booking.pickupLocation||'')))}</td>
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
        if (typeof window.notify === 'function') { window.notify(String(message||''), String(type||'info')); return; }
        try { console.log(String(type||'info').toUpperCase()+': '+String(message||'')); } catch(_) {}
    }

    async loadReportsPage(days = 7) {
        const container = document.getElementById('reportsContent');
        if (container) container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading report...</div>';
        let data = null;
        try {
            const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
            const qs = `?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`;
            const resp = await this.authFetch(`${this.API_BASE_URL}/admin/analytics${qs}`);
            if (resp.ok) data = await resp.json();
        } catch(_) {}
        let trends = null;
        try {
            const dresp = await this.authFetch(`${this.API_BASE_URL}/admin/dashboard`);
            if (dresp.ok) {
                const dj = await dresp.json();
                trends = dj && dj.bookingTrends ? dj.bookingTrends : null;
            }
        } catch(_) {}
        try { if (!this.bookings || !this.bookings.length) await this.loadBookings(); } catch(_) {}
        const rowsRange = this.filterBookingsByRange(this.bookings, days);
        if (!data || (!Array.isArray(data.bookingsByStatus) || data.bookingsByStatus.length===0)) {
            data = this.buildClientAnalytics(rowsRange);
        }
        if (!trends) {
            try { trends = this.buildTrendsFromBookings(rowsRange, days); } catch(_) {}
        }
        data.bookingTrends = trends || [];
        this.renderReports(data, days);
    }

    buildClientAnalytics(rows) {
        rows = Array.isArray(rows) ? rows.slice() : [];
        const byStatus = {};
        const byTrip = {};
        let totalRevenue = 0;
        let start = null, end = null;
        rows.forEach(b => {
            const st = String(b.status||'').toUpperCase();
            byStatus[st] = (byStatus[st]||0) + 1;
            const tt = String(b.tripType||'').toUpperCase();
            byTrip[tt] = (byTrip[tt]||0) + 1;
            const d = b.date || b.pickup_date || b.createdAt || b.created_at;
            if (d) {
                const dt = new Date(d);
                if (!start || dt < start) start = dt;
                if (!end || dt > end) end = dt;
            }
            const stl = st.toLowerCase();
            if (stl==='confirmed' || stl==='completed') totalRevenue += Number(b.amount || b.price || 0);
        });
        const revenueByTripType = Object.keys(byTrip).map(k => ({ tripType: k, _sum: { price: rows.filter(r => String(r.tripType||'').toUpperCase()===k && ['confirmed','completed'].includes(String(r.status||'').toLowerCase())).reduce((s, r) => s + Number(r.amount || r.price || 0), 0) } }));
        const bookingsByStatus = Object.keys(byStatus).map(k => ({ status: k, _count: byStatus[k] }));
        const bookingsByTripType = Object.keys(byTrip).map(k => ({ tripType: k, _count: byTrip[k] }));
        return { bookingsByStatus, bookingsByTripType, revenueByTripType, dateRange: { start: start ? start.toISOString() : '', end: end ? end.toISOString() : '' } };
    }

    buildTrendsFromBookings(rows, days = 7) {
        const now = new Date(); now.setHours(0,0,0,0);
        const series = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            const count = (rows || []).filter(b => {
                const dt = new Date(b.date || b.pickup_date || b.createdAt || b.created_at);
                return dt >= d && dt < next;
            }).length;
            series.push({ date: d.toISOString().split('T')[0], bookings: count });
        }
        return series;
    }

    renderReports(data, days = 7) {
        const container = document.getElementById('reportsContent');
        if (!container) return;
        const bs = Array.isArray(data.bookingsByStatus) ? data.bookingsByStatus : [];
        const bt = Array.isArray(data.bookingsByTripType) ? data.bookingsByTripType : [];
        const rv = Array.isArray(data.revenueByTripType) ? data.revenueByTripType : [];
        const tr = Array.isArray(data.bookingTrends) ? data.bookingTrends : [];
        const getCount = r => Number(((typeof r._count === 'object') ? (r._count._all || 0) : (r._count || r.count || r.counts || 0)));
        let totalBookings = bs.reduce((s, r) => s + getCount(r), 0);
        let totalRevenue = rv.reduce((s, r) => s + Number((r._sum && r._sum.price) || r.sum || 0), 0);
        if ((!totalBookings || !rv.length) && Array.isArray(this.bookings)) {
            const rowsRange = this.filterBookingsByRange(this.bookings, days);
            totalBookings = rowsRange.length;
            totalRevenue = rowsRange.filter(b => ['confirmed','completed'].includes(String(b.status||'').toLowerCase())).reduce((s,b)=>s+Number(b.amount||b.price||0),0);
        }
        const fmt = n => '₹' + Number(n || 0).toLocaleString();
        const rangeText = (data.dateRange && data.dateRange.start && data.dateRange.end) ? (new Date(data.dateRange.start).toLocaleDateString() + ' — ' + new Date(data.dateRange.end).toLocaleDateString()) : '';
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><h3>Total Bookings</h3><div class="stat-number">${totalBookings}</div></div>
                <div class="stat-card"><h3>Total Revenue</h3><div class="stat-number">${fmt(totalRevenue)}</div></div>
                <div class="stat-card"><h3>Airport → Home</h3><div class="stat-number">${(bt && bt.length) ? bt.filter(r => String(r.tripType||'').toUpperCase()==='AIRPORT_TO_HOME').reduce((s,r)=>s+getCount(r),0) : this.filterBookingsByRange(this.bookings, days).filter(b=>String(b.tripType||'').toUpperCase()==='AIRPORT_TO_HOME').length}</div></div>
                <div class="stat-card"><h3>Home → Airport</h3><div class="stat-number">${(bt && bt.length) ? bt.filter(r => String(r.tripType||'').toUpperCase()==='HOME_TO_AIRPORT').reduce((s,r)=>s+getCount(r),0) : this.filterBookingsByRange(this.bookings, days).filter(b=>String(b.tripType||'').toUpperCase()==='HOME_TO_AIRPORT').length}</div></div>
            </div>
            ${rangeText ? `<div style="margin:10px 0;color:#7f8c8d;">${rangeText}</div>` : ''}
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
                <div>
                    <h3 style="margin:0 0 10px 0;">Bookings by Status</h3>
                    <canvas id="statusChart" width="700" height="280" style="width:100%;max-width:700px;height:280px"></canvas>
                    <table>
                        <thead><tr><th>Status</th><th>Count</th></tr></thead>
                        <tbody>
                            ${bs.map(r => `<tr><td>${String(r.status||'')}</td><td>${getCount(r)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                <div>
                    <h3 style="margin:0 0 10px 0;">Revenue by Trip Type</h3>
                    <canvas id="revenueChart" width="700" height="280" style="width:100%;max-width:700px;height:280px"></canvas>
                    <table>
                        <thead><tr><th>Trip Type</th><th>Revenue</th></tr></thead>
                        <tbody>
                            ${rv.map(r => `<tr><td>${String(r.tripType||'').replace('_',' ')}</td><td>${fmt((r._sum && r._sum.price) || 0)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div style="margin-top:20px;">
                <h3 style="margin:0 0 10px 0;">Booking Trends (Last ${days} days)</h3>
                <canvas id="trendsChart" width="900" height="300" style="width:100%;max-width:900px;height:300px"></canvas>
                <table>
                    <thead><tr><th>Date</th><th>Bookings</th></tr></thead>
                    <tbody>
                        ${tr.map(d => `<tr><td>${new Date(d.date).toLocaleDateString()}</td><td>${Number(d.bookings||0)}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const palette = ['#3498db','#27ae60','#e67e22','#e74c3c','#9b59b6','#2ecc71','#f1c40f'];
        const statusCounts = bs.map(r => getCount(r));
        const statusLabels = bs.map(r => String(r.status||''));
        const revenueValues = rv.map(r => Number((r._sum && r._sum.price) || 0));
        const revenueLabels = rv.map(r => String(r.tripType||'').replace('_',' '));
        const trendValues = tr.map(d => Number(d.bookings||0));
        const trendLabels = tr.map(d => new Date(d.date).toLocaleDateString());

        const statusCanvas = document.getElementById('statusChart');
        const revenueCanvas = document.getElementById('revenueChart');
        const trendsCanvas = document.getElementById('trendsChart');
        if (statusCanvas && statusCounts.length) this.drawBarChart(statusCanvas, statusLabels, statusCounts, palette);
        if (revenueCanvas && revenueValues.length) this.drawBarChart(revenueCanvas, revenueLabels, revenueValues, palette);
        if (trendsCanvas && trendValues.length) this.drawBarChart(trendsCanvas, trendLabels, trendValues, ['#3498db']);
    }

    drawBarChart(canvas, labels, values, colors) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0,0,w,h);
        const pad = 40;
        const max = Math.max(...values, 1);
        const bw = Math.max(20, Math.floor((w - pad*2) / values.length) - 10);
        ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
        values.forEach((v, i) => {
            const x = pad + i * (bw + 10);
            const bh = Math.round((h - pad*2) * (v / max));
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(x, h - pad - bh, bw, bh);
            ctx.fillStyle = '#333'; ctx.font = '12px Segoe UI'; ctx.textAlign = 'center';
            ctx.fillText(String(labels[i]||''), x + bw/2, h - pad + 16);
            ctx.fillText(String(v), x + bw/2, h - pad - bh - 6);
        });
    }

    filterBookingsByRange(rows, days = 7) {
        const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
        start.setHours(0,0,0,0); end.setHours(23,59,59,999);
        return (rows || []).filter(b => {
            const dt = new Date(b.date || b.pickup_date || b.createdAt || b.created_at);
            return dt >= start && dt <= end;
        });
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

// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.bookings = [];
        this.drivers = [];
        this.availability = [];
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        this.checkAuth();
        this.bindEvents();
        if (this.currentUser) {
            await this.loadDashboardData();
        }
    }

    checkAuth() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.showLogin();
            return;
        }
        this.currentUser = { token };
        this.showAdminContent();
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
    }

    showAdminContent() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Booking actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-booking')) {
                this.viewBooking(e.target.dataset.id);
            } else if (e.target.classList.contains('edit-booking')) {
                this.editBooking(e.target.dataset.id);
            } else if (e.target.classList.contains('cancel-booking')) {
                this.cancelBooking(e.target.dataset.id);
            } else if (e.target.classList.contains('confirm-booking')) {
                this.confirmBooking(e.target.dataset.id);
            }
        });

        // Driver actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-driver')) {
                this.editDriver(e.target.dataset.id);
            } else if (e.target.classList.contains('toggle-driver')) {
                this.toggleDriverStatus(e.target.dataset.id);
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

            if (response.ok && data.user.role === 'admin') {
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
            await Promise.all([
                this.loadBookings(),
                this.loadDrivers(),
                this.loadAvailability()
            ]);
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    async loadBookings() {
        try {
            const response = await fetch('http://localhost:3001/api/bookings', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });
            this.bookings = await response.json();
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    async loadDrivers() {
        try {
            const response = await fetch('http://localhost:3001/api/drivers', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });
            this.drivers = await response.json();
        } catch (error) {
            console.error('Error loading drivers:', error);
        }
    }

    async loadAvailability() {
        try {
            const response = await fetch('http://localhost:3001/api/availability', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });
            this.availability = await response.json();
        } catch (error) {
            console.error('Error loading availability:', error);
        }
    }

    updateDashboard() {
        this.updateStatsCards();
        this.updateRecentBookings();
    }

    updateStatsCards() {
        const stats = this.calculateStats();
        
        document.getElementById('totalBookings').textContent = stats.totalBookings;
        document.getElementById('pendingBookings').textContent = stats.pendingBookings;
        document.getElementById('confirmedBookings').textContent = stats.confirmedBookings;
        document.getElementById('totalRevenue').textContent = `₹${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('activeDrivers').textContent = stats.activeDrivers;
    }

    calculateStats() {
        const stats = {
            totalBookings: this.bookings.length,
            pendingBookings: this.bookings.filter(b => b.status === 'pending').length,
            confirmedBookings: this.bookings.filter(b => b.status === 'confirmed').length,
            totalRevenue: this.bookings
                .filter(b => b.status === 'confirmed' || b.status === 'completed')
                .reduce((sum, b) => sum + b.amount, 0),
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
            tbody.innerHTML = recentBookings.map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.customerName}</td>
                    <td>${new Date(booking.date).toLocaleDateString()}</td>
                    <td>${booking.timeSlot}</td>
                    <td>${booking.tripType}</td>
                    <td>
                        <span class="status-badge status-${booking.status}">
                            ${booking.status}
                        </span>
                    </td>
                    <td>₹${booking.amount}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-booking" data-id="${booking.id}">
                            View
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    navigateToPage(page) {
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
        }
    }

    async loadBookingsPage() {
        await this.loadBookings();
        this.renderBookingsTable();
    }

    renderBookingsTable() {
        const tbody = document.getElementById('bookingsTableBody');
        if (tbody) {
            tbody.innerHTML = this.bookings.map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.customerName}</td>
                    <td>${booking.phoneNumber}</td>
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
                    <td>${new Date(booking.createdAt).toLocaleDateString()}</td>
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
                            <button class="btn btn-sm btn-primary edit-driver" data-id="${driver.id}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-warning toggle-driver" data-id="${driver.id}">
                                ${driver.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                            </button>
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

    renderAvailabilityTable() {
        const tbody = document.getElementById('availabilityTableBody');
        if (tbody) {
            tbody.innerHTML = this.availability.map(avail => `
                <tr>
                    <td>${new Date(avail.date).toLocaleDateString()}</td>
                    <td>
                        <span class="availability-status ${avail.morningAvailable ? 'available' : 'unavailable'}">
                            ${avail.morningAvailable ? 'Available' : 'Booked'}
                        </span>
                    </td>
                    <td>
                        <span class="availability-status ${avail.eveningAvailable ? 'available' : 'unavailable'}">
                            ${avail.eveningAvailable ? 'Available' : 'Booked'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-availability" data-date="${avail.date}">
                            Edit
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    viewBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        alert(`Booking Details:\n\n` +
              `ID: ${booking.id}\n` +
              `Customer: ${booking.customerName}\n` +
              `Phone: ${booking.phoneNumber}\n` +
              `Date: ${new Date(booking.date).toLocaleDateString()}\n` +
              `Time: ${booking.timeSlot}\n` +
              `Trip: ${booking.tripType}\n` +
              `Location: ${booking.pickupLocation}\n` +
              `Amount: ₹${booking.amount}\n` +
              `Status: ${booking.status}\n` +
              `Created: ${new Date(booking.createdAt).toLocaleDateString()}`);
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
            const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showNotification('Booking status updated successfully', 'success');
                await this.loadBookings();
                this.renderBookingsTable();
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

        await this.updateBookingStatus(bookingId, 'confirmed');
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        await this.updateBookingStatus(bookingId, 'cancelled');
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
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`,
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

        await this.updateDriver(driverId, { isAvailable: !driver.isAvailable });
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

        const tbody = document.getElementById('bookingsTableBody');
        if (tbody) {
            tbody.innerHTML = filteredBookings.map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.customerName}</td>
                    <td>${booking.phoneNumber}</td>
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
                    <td>${new Date(booking.createdAt).toLocaleDateString()}</td>
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

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});
class QmartAdmin {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.socket = null;
        this.currentPage = 'dashboard';
        this.charts = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }
    
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateToPage(page);
            });
        });
        
        // Filters
        document.getElementById('userRoleFilter')?.addEventListener('change', () => {
            this.loadUsers();
        });
        
        document.getElementById('transactionStatusFilter')?.addEventListener('change', () => {
            this.loadTransactions();
        });
        
        document.getElementById('transactionTypeFilter')?.addEventListener('change', () => {
            this.loadTransactions();
        });
        
        document.getElementById('kycStatusFilter')?.addEventListener('change', () => {
            this.loadKYCRequests();
        });
    }
    
    checkAuthentication() {
        if (this.token) {
            this.showDashboard();
            this.initializeWebSocket();
            this.loadDashboardData();
        } else {
            this.showLogin();
        }
    }
    
    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        
        // Show loading state
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'inline';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('http://localhost:5000/api/admin/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.data.token;
                localStorage.setItem('adminToken', this.token);
                localStorage.setItem('adminName', `${data.data.admin.firstName} ${data.data.admin.lastName}`);
                
                this.showDashboard();
                this.initializeWebSocket();
                this.loadDashboardData();
                this.showToast('Login successful!', 'success');
            } else {
                errorDiv.textContent = data.message || 'Login failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.style.display = 'block';
        } finally {
            // Reset button state
            submitBtn.querySelector('.btn-text').style.display = 'inline';
            submitBtn.querySelector('.btn-loading').style.display = 'none';
            submitBtn.disabled = false;
        }
    }
    
    handleLogout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminName');
        this.token = null;
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
    }
    
    showLogin() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        const adminName = localStorage.getItem('adminName') || 'Admin';
        document.getElementById('adminName').textContent = adminName;
    }
    
    initializeWebSocket() {
        this.socket = io({
            auth: {
                token: this.token
            }
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to admin WebSocket');
        });
        
        this.socket.on('newTransaction', (data) => {
            this.handleNewTransaction(data);
        });
        
        this.socket.on('newKYCRequest', (data) => {
            this.handleNewKYCRequest(data);
        });
        
        this.socket.on('securityAlert', (data) => {
            this.handleSecurityAlert(data);
        });
    }
    
    navigateToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // Update page content
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        document.getElementById(`${page}Page`).classList.add('active');
        
        // Update breadcrumb
        document.getElementById('currentPage').textContent = this.getPageTitle(page);
        
        this.currentPage = page;
        
        // Load page-specific data
        this.loadPageData(page);
    }
    
    getPageTitle(page) {
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            transactions: 'Transactions',
            kyc: 'KYC Management',
            analytics: 'Analytics',
            security: 'Security',
            reports: 'Reports'
        };
        return titles[page] || 'Dashboard';
    }
    
    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'kyc':
                await this.loadKYCRequests();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'security':
                await this.loadSecurityData();
                break;
        }
    }
    
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };
        
        const response = await fetch(endpoint, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            this.handleLogout();
            throw new Error('Unauthorized');
        }
        
        return response.json();
    }
    
    async loadDashboardData() {
        try {
            this.showLoading();
            
            const data = await this.apiCall('/api/admin/dashboard-stats');
            
            if (data.status === 'success') {
                this.updateDashboardStats(data.data);
                this.createDashboardCharts(data.data.charts);
            }
        } catch (error) {
            this.showToast('Failed to load dashboard data', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    updateDashboardStats(data) {
        document.getElementById('totalUsers').textContent = data.overview.totalUsers.toLocaleString();
        document.getElementById('totalBalance').textContent = data.overview.formattedTotalBalance;
        document.getElementById('totalTransactions').textContent = data.overview.totalTransactions.toLocaleString();
        document.getElementById('pendingKYC').textContent = data.overview.pendingKYC;
        
        // Update KYC badge in navigation
        document.getElementById('kycBadge').textContent = data.overview.pendingKYC;
    }
    
    createDashboardCharts(chartData) {
        // Transaction Volume Chart
        const transactionCtx = document.getElementById('transactionChart').getContext('2d');
        
        if (this.charts.transaction) {
            this.charts.transaction.destroy();
        }
        
        this.charts.transaction = new Chart(transactionCtx, {
            type: 'line',
            data: {
                labels: chartData.dailyTransactions.map(d => `${d._id.day}/${d._id.month}`),
                datasets: [{
                    label: 'Transaction Volume (₦)',
                    data: chartData.dailyTransactions.map(d => d.volume),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₦' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // User Registration Chart
        const registrationCtx = document.getElementById('registrationChart').getContext('2d');
        
        if (this.charts.registration) {
            this.charts.registration.destroy();
        }
        
        this.charts.registration = new Chart(registrationCtx, {
            type: 'bar',
            data: {
                labels: chartData.dailyRegistrations.map(d => `${d._id.day}/${d._id.month}`),
                datasets: [
                    {
                        label: 'Customers',
                        data: chartData.dailyRegistrations.map(d => d.customers),
                        backgroundColor: '#27ae60'
                    },
                    {
                        label: 'Merchants',
                        data: chartData.dailyRegistrations.map(d => d.merchants),
                        backgroundColor: '#f39c12'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('notificationToast');
        const messageEl = document.getElementById('toastMessage');
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    handleNewTransaction(data) {
        // Update notification count
        const notificationCount = document.getElementById('notificationCount');
        const currentCount = parseInt(notificationCount.textContent) || 0;
        notificationCount.textContent = currentCount + 1;
        
        // Show toast notification
        this.showToast(`New transaction: ₦${data.amount.toLocaleString()}`, 'info');
        
        // Refresh current page if viewing transactions
        if (this.currentPage === 'transactions') {
            this.loadTransactions();
        }
    }
    
    handleNewKYCRequest(data) {
        // Update KYC badge
        const kycBadge = document.getElementById('kycBadge');
        const currentCount = parseInt(kycBadge.textContent) || 0;
        kycBadge.textContent = currentCount + 1;
        
        this.showToast('New KYC request submitted', 'info');
        
        if (this.currentPage === 'kyc') {
            this.loadKYCRequests();
        }
    }
    
    handleSecurityAlert(data) {
        this.showToast(`Security Alert: ${data.message}`, 'warning');
        
        if (this.currentPage === 'security') {
            this.loadSecurityData();
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.qmartAdmin = new QmartAdmin();
});

// Global functions for exports and actions
function exportUsers() {
    window.qmartAdmin.exportData('users');
}

function exportTransactions() {
    window.qmartAdmin.exportData('transactions');
}

function exportKYC() {
    window.qmartAdmin.exportData('kyc');
}

function generateFinancialReport() {
    window.qmartAdmin.generateReport('financial');
}

function generateUserReport() {
    window.qmartAdmin.generateReport('users');
}

function generateKYCReport() {
    window.qmartAdmin.generateReport('kyc');
}

function generateSecurityReport() {
    window.qmartAdmin.generateReport('security');
}

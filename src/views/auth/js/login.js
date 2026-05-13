/**
 * Login Frontend Controller
 * Xử lý sự kiện từ UI và giao tiếp với backend
 */

class LoginViewController {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.loginBtn = document.getElementById('loginBtn');
        this.errorAlert = document.getElementById('errorAlert');
        this.successAlert = document.getElementById('successAlert');
        this.usernameError = document.getElementById('usernameError');
        this.passwordError = document.getElementById('passwordError');

        // Only initialize if all elements exist
        if (this.loginForm) {
            this.initializeEventListeners();
            this.restoreSessionIfExists();
        }
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Form submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Toggle password visibility
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility();
            });
        }

        // Clear errors on input
        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', () => this.clearError('username'));
        }
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.clearError('password'));
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';
        this.togglePasswordBtn.innerHTML = isPassword 
            ? '<span class="icon">🙈</span>' 
            : '<span class="icon">👁️</span>';
    }

    /**
     * Validate form inputs
     */
    validateForm() {
        let isValid = true;
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();

        // Validate username
        if (!username) {
            this.showError('username', 'Vui lòng nhập tên đăng nhập');
            isValid = false;
        } else if (username.length < 3) {
            this.showError('username', 'Tên đăng nhập phải có ít nhất 3 ký tự');
            isValid = false;
        }

        // Validate password
        if (!password) {
            this.showError('password', 'Vui lòng nhập mật khẩu');
            isValid = false;
        } else if (password.length < 6) {
            this.showError('password', 'Mật khẩu phải có ít nhất 6 ký tự');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Show error message for a field
     */
    showError(fieldName, message) {
        if (fieldName === 'username') {
            this.usernameError.textContent = message;
            this.usernameError.classList.add('show');
            this.usernameInput.classList.add('input-error');
        } else if (fieldName === 'password') {
            this.passwordError.textContent = message;
            this.passwordError.classList.add('show');
            this.passwordInput.classList.add('input-error');
        }
    }

    /**
     * Clear error message for a field
     */
    clearError(fieldName) {
        if (fieldName === 'username') {
            this.usernameError.textContent = '';
            this.usernameError.classList.remove('show');
            this.usernameInput.classList.remove('input-error');
        } else if (fieldName === 'password') {
            this.passwordError.textContent = '';
            this.passwordError.classList.remove('show');
            this.passwordInput.classList.remove('input-error');
        }
    }

    /**
     * Clear all alerts
     */
    clearAlerts() {
        this.errorAlert.style.display = 'none';
        this.errorAlert.textContent = '';
        this.successAlert.style.display = 'none';
        this.successAlert.textContent = '';
    }

    /**
     * Show error alert
     */
    showErrorAlert(message) {
        this.errorAlert.textContent = message;
        this.errorAlert.style.display = 'block';
    }

    /**
     * Show success alert
     */
    showSuccessAlert(message) {
        this.successAlert.textContent = message;
        this.successAlert.style.display = 'block';
    }

    /**
     * Set button loading state
     */
    setButtonLoading(isLoading) {
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnLoader = this.loginBtn.querySelector('.btn-loader');

        if (isLoading) {
            this.loginBtn.disabled = true;
            this.loginBtn.classList.add('loading');
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('loading');
            btnText.style.display = 'flex';
            btnLoader.style.display = 'none';
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();

        // Clear alerts
        this.clearAlerts();

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        // Get form data
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();

        // Set loading state
        this.setButtonLoading(true);

        try {
            // Call login API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save to localStorage
                this.saveLoginData(data.user);

                // Show success message
                this.showSuccessAlert(data.message || 'Đăng nhập thành công!');

                // Redirect to main page after 1 second
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else if (response.status === 429 && data.locked) {
                // Account is locked
                this.showErrorAlert(data.message);
                
                // Disable login button for the remaining time
                this.disableLoginTemporarily(data.remainingTime);
            } else {
                // Show error message
                this.showErrorAlert(data.message || 'Sai thông tin đăng nhập, xin vui lòng kiểm tra lại');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showErrorAlert('Lỗi kết nối đến server. Vui lòng thử lại.');
        } finally {
            this.setButtonLoading(false);
        }
    }

    /**
     * Disable login button temporarily
     */
    disableLoginTemporarily(remainingSeconds) {
        this.loginBtn.disabled = true;
        let timeLeft = remainingSeconds;

        const updateButtonText = () => {
            const btnText = this.loginBtn.querySelector('.btn-text');
            const minutes = Math.ceil(timeLeft / 60);
            btnText.textContent = `Khóa ${minutes}p`;
        };

        updateButtonText();

        const interval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(interval);
                this.loginBtn.disabled = false;
                this.loginBtn.querySelector('.btn-text').textContent = 'Đăng Nhập';
            } else {
                updateButtonText();
            }
        }, 1000);
    }

    /**
     * Save login data to localStorage
     */
    saveLoginData(user) {
        const loginData = {
            username: user.username,
            isAuthenticated: true,
            loginTime: user.loginTime || new Date().toISOString()
        };
        localStorage.setItem('auth_user', JSON.stringify(loginData));
    }

    /**
     * Restore session from localStorage
     */
    restoreSessionIfExists() {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.isAuthenticated && user.username) {
                    // Session exists, redirect to main page
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Error restoring session:', error);
                localStorage.removeItem('auth_user');
            }
        }
    }

    /**
     * Logout
     */
    static logout() {
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        const storedUser = localStorage.getItem('auth_user');
        if (!storedUser) return false;
        try {
            const user = JSON.parse(storedUser);
            return user.isAuthenticated && user.username;
        } catch {
            return false;
        }
    }

    /**
     * Get current user
     */
    static getCurrentUser() {
        const storedUser = localStorage.getItem('auth_user');
        if (!storedUser) return null;
        try {
            return JSON.parse(storedUser);
        } catch {
            return null;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LoginViewController();
});

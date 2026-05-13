/**
 * Authentication Controller
 * Bộ điều hướng: Nhận sự kiện từ View -> Gọi Service -> Trả kết quả cho View
 */

const authService = require('../services/auth.service');

class AuthController {
    /**
     * Handle login
     * @param {string} username
     * @param {string} password
     * @returns {Object} - { success, message, user }
     */
    static handleLogin(username, password) {
        return authService.login(username, password);
    }

    /**
     * Handle logout
     */
    static handleLogout() {
        return authService.logout();
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        return authService.isAuthenticated();
    }

    /**
     * Get current user
     */
    static getCurrentUser() {
        return authService.getCurrentUser();
    }

    /**
     * Restore session từ localStorage
     * @param {string} storedUserData - JSON string từ localStorage
     */
    static restoreSession(storedUserData) {
        try {
            if (storedUserData) {
                const userData = JSON.parse(storedUserData);
                if (userData.isAuthenticated && userData.username) {
                    // Restore authenticated state
                    return {
                        success: true,
                        message: 'Session restored',
                        user: userData
                    };
                }
            }
            return {
                success: false,
                message: 'No valid session found',
                user: null
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error restoring session',
                user: null
            };
        }
    }
}

module.exports = AuthController;

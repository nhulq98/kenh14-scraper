/**
 * Authentication Service
 * Xử lý logic xác thực người dùng
 */

const User = require('../models/user.model');

class AuthService {
    constructor() {
        // Tạo user mặc định từ biến môi trường
        this.defaultUser = new User(
            process.env.AUTH_USERNAME || 'admin',
            process.env.AUTH_PASSWORD || 'cucvang2003'
        );
    }

    /**
     * Kiểm tra thông tin đăng nhập
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Object} - { success: boolean, message: string, user: User }
     */
    login(username, password) {
        // Validate input
        if (!username || !password) {
            return {
                success: false,
                message: 'Vui lòng nhập username và password',
                user: null
            };
        }

        // Kiểm tra credentials
        if (this.defaultUser.validate(username, password)) {
            this.defaultUser.setAuthenticated(true);
            return {
                success: true,
                message: 'Đăng nhập thành công',
                user: this.defaultUser.serialize()
            };
        }

        return {
            success: false,
            message: 'Sai thông tin đăng nhập, xin vui lòng kiểm tra lại',
            user: null
        };
    }

    /**
     * Logout user
     */
    logout() {
        this.defaultUser.setAuthenticated(false);
        return {
            success: true,
            message: 'Đăng xuất thành công'
        };
    }

    /**
     * Kiểm tra user đã đăng nhập hay chưa
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.defaultUser.isAuthenticated;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        return this.defaultUser.getInfo();
    }
}

module.exports = new AuthService();

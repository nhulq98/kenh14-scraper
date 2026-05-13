/**
 * User Model
 * Chứa logic dữ liệu của User
 */

class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.isAuthenticated = false;
        this.loginTime = null;
    }

    /**
     * Validate user credentials
     * @param {string} inputUsername - Username nhập vào
     * @param {string} inputPassword - Password nhập vào
     * @returns {boolean} - True nếu thông tin đúng
     */
    validate(inputUsername, inputPassword) {
        return this.username === inputUsername && this.password === inputPassword;
    }

    /**
     * Set authentication status
     * @param {boolean} status - Trạng thái xác thực
     */
    setAuthenticated(status) {
        this.isAuthenticated = status;
        if (status) {
            this.loginTime = new Date().toISOString();
        } else {
            this.loginTime = null;
        }
    }

    /**
     * Get user info (không trả password)
     */
    getInfo() {
        return {
            username: this.username,
            isAuthenticated: this.isAuthenticated,
            loginTime: this.loginTime
        };
    }

    /**
     * Serialize user info để lưu vào localStorage
     */
    serialize() {
        return {
            username: this.username,
            isAuthenticated: this.isAuthenticated,
            loginTime: this.loginTime
        };
    }
}

module.exports = User;

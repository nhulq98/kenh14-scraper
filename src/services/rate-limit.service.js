/**
 * Rate Limiting Service
 * Quản lý giới hạn số lần đăng nhập sai theo IP
 * 
 * Luật:
 * - Tối đa 5 lần đăng nhập sai
 * - Nếu sai quá 5 lần, khóa 5 phút
 * - Mỗi lần phạm luật, thời gian khóa tăng 5 phút
 */

const fs = require('fs');
const path = require('path');

const RATE_LIMIT_FILE = path.join(__dirname, '../cache/rate_limit.json');
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const INCREASE_PER_VIOLATION = 5 * 60 * 1000; // 5 minutes increase

class RateLimitService {
    constructor() {
        this.limits = this.loadLimits();
    }

    /**
     * Load rate limit data from file
     */
    loadLimits() {
        try {
            if (fs.existsSync(RATE_LIMIT_FILE)) {
                const data = fs.readFileSync(RATE_LIMIT_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading rate limits:', error);
        }
        return {};
    }

    /**
     * Save rate limit data to file
     */
    saveLimits() {
        try {
            const cacheDir = path.dirname(RATE_LIMIT_FILE);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(this.limits, null, 2));
        } catch (error) {
            console.error('Error saving rate limits:', error);
        }
    }

    /**
     * Get IP from request
     */
    getClientIP(req) {
        return (
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            'unknown'
        );
    }

    /**
     * Check if IP is locked out
     * @returns { isLocked: boolean, remainingTime: number, violationCount: number }
     */
    checkLockout(ip) {
        const record = this.limits[ip];

        // No record = no lockout
        if (!record) {
            return {
                isLocked: false,
                remainingTime: 0,
                violationCount: 0
            };
        }

        const now = Date.now();
        const unlockTime = record.unlockTime || 0;

        // Check if lockout expired
        if (now >= unlockTime) {
            // Lockout expired, clear the record
            delete this.limits[ip];
            this.saveLimits();
            return {
                isLocked: false,
                remainingTime: 0,
                violationCount: record.violationCount || 0
            };
        }

        // Still locked
        const remainingTime = Math.ceil((unlockTime - now) / 1000); // in seconds
        return {
            isLocked: true,
            remainingTime,
            violationCount: record.violationCount || 0
        };
    }

    /**
     * Record failed login attempt
     * @returns { isLocked: boolean, remainingTime: number, violationCount: number }
     */
    recordFailedAttempt(ip) {
        const now = Date.now();
        let record = this.limits[ip];

        // First attempt
        if (!record) {
            this.limits[ip] = {
                attempts: 1,
                firstAttemptTime: now,
                violationCount: 0,
                lastAttemptTime: now
            };
            console.log(`   📊 Rate Limit - First attempt from IP ${ip}, attempts: 1`);
        } else {
            // Check if user was previously locked and now unlocked
            const unlockTime = record.unlockTime || 0;
            if (unlockTime > 0 && now >= unlockTime) {
                // Lockout has expired, reset for new attempt cycle
                this.limits[ip] = {
                    attempts: 1,
                    firstAttemptTime: now,
                    violationCount: record.violationCount || 0,
                    lastAttemptTime: now
                };
                console.log(`   📊 Rate Limit - Lockout expired, resetting for IP ${ip}`);
            } else if (unlockTime > 0 && now < unlockTime) {
                // Still in lockout period
                const remainingTime = Math.ceil((unlockTime - now) / 1000);
                console.log(`   🔒 Rate Limit - IP ${ip} still locked, remaining: ${remainingTime}s`);
                return {
                    isLocked: true,
                    remainingTime,
                    violationCount: record.violationCount || 0
                };
            } else {
                // Increment attempts for same cycle
                this.limits[ip].attempts += 1;
                this.limits[ip].lastAttemptTime = now;
                console.log(`   📊 Rate Limit - Increment attempt for IP ${ip}, attempts: ${this.limits[ip].attempts}`);
            }
        }

        record = this.limits[ip];

        // Check if exceeded max attempts
        if (record.attempts > MAX_ATTEMPTS) {
            // Calculate lockout time: BASE + (violationCount * INCREASE)
            const violationCount = record.violationCount || 0;
            const lockoutDuration = BASE_LOCKOUT_TIME + (violationCount * INCREASE_PER_VIOLATION);

            record.unlockTime = now + lockoutDuration;
            record.violationCount = violationCount + 1;
            record.attempts = 0; // Reset attempts after lockout

            this.saveLimits();

            const minutes = Math.ceil(lockoutDuration / 1000 / 60);
            console.log(`   🔒 Rate Limit - LOCKED IP ${ip}, violation #${record.violationCount}, duration: ${minutes}m`);

            return {
                isLocked: true,
                remainingTime: Math.ceil(lockoutDuration / 1000), // in seconds
                violationCount: record.violationCount
            };
        }

        this.saveLimits();

        return {
            isLocked: false,
            remainingTime: 0,
            attemptRemaining: MAX_ATTEMPTS - record.attempts,
            violationCount: record.violationCount || 0
        };
    }

    /**
     * Clear failed attempts for IP (successful login)
     */
    clearAttempts(ip) {
        if (this.limits[ip]) {
            // Keep violation count but reset attempts
            this.limits[ip].attempts = 0;
            this.limits[ip].firstAttemptTime = Date.now();
            this.saveLimits();
        }
    }

    /**
     * Get rate limit info for debugging
     */
    getInfo(ip) {
        return this.limits[ip] || null;
    }

    /**
     * Clear all limits (for testing/admin)
     */
    clearAll() {
        this.limits = {};
        this.saveLimits();
    }
}

module.exports = new RateLimitService();

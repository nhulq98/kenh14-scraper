const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const trendingService = require('./src/services/trending.service');
const updateTrendingData = trendingService.updateTrendingData.bind(trendingService);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

// Load controllers
const AuthController = require('./src/controllers/auth.controller');
const VoiceController = require('./src/controllers/voice.controller');
const ScraperController = require('./src/controllers/scraper.controller');
const GeminiController = require('./src/controllers/gemini.controller');
const TrendingController = require('./src/controllers/trending.controller');

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username và password là bắt buộc'
            });
        }

        const result = AuthController.handleLogin(username, password);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                user: result.user
            });
        } else {
            res.status(401).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    try {
        const result = AuthController.handleLogout();
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng xuất'
        });
    }
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
    try {
        const isAuthenticated = AuthController.isAuthenticated();
        const user = AuthController.getCurrentUser();

        res.json({
            success: true,
            isAuthenticated: isAuthenticated,
            user: user
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra authentication'
        });
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'auth', 'html', 'login.html'));
});

// Serve login CSS
app.get('/auth/css/login.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'auth', 'css', 'login.css'));
});

// Serve login JS
app.get('/auth/js/login.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'auth', 'js', 'login.js'));
});

// Serve HTML file (Main Dashboard)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// SCRAPE ENDPOINT
// ============================================================

app.post('/api/scrape', ScraperController.handleScrape);

// ============================================================
// SUMMARIZE ENDPOINT
// ============================================================

app.post('/api/summarize', GeminiController.handleSummarize);

// ============================================================
// TRENDING ENDPOINTS
// ============================================================

app.get('/api/trending', TrendingController.handleGetTrending);
app.post('/api/trending/refresh', TrendingController.handleRefreshTrending);

// ============================================================
// SCHEDULER
// ============================================================

// Scheduler: cập nhật lúc 8:00 sáng mỗi ngày (giờ VN = UTC+7)
cron.schedule('0 8 * * *', () => {
    console.log('⏰ [Scheduler] 8:00 SA – đang cập nhật trending...');
    updateTrendingData();
}, {
    timezone: 'Asia/Ho_Chi_Minh'
});

// ============================================================
// SERVER STARTUP
// ============================================================

// ==================== VIETTEL TTS ENDPOINT ====================
app.post('/api/tts/convert', VoiceController.handleVoiceConvert);

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📰 Kênh14 Scraper is ready!');
    console.log('⏰ Trending sẽ tự cập nhật lúc 8:00 SA mỗi ngày (giờ VN)');
});

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// import cors from 'cors';
// import cheerio from 'cheerio';
// import path from 'path';
// import express from 'express';
// import axios from 'axios'; // Nếu bạn vẫn dùng axios ở chỗ khác
// import dotenv from 'dotenv';

dotenv.config();

// Import services and utilities
const { scrapeArticle } = require('./services/scraper');
const { generateSummaryWithRetry } = require('./services/gemini');
const { updateTrendingData, getTrendingCache } = require('./services/trending');
const { getErrorMessage, isRateLimitOrHighDemandError } = require('./utils/helpers');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

// Load authentication service
const AuthController = require('./src/controllers/auth.controller');

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

app.post('/api/scrape', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL là bắt buộc'
            });
        }

        if (!(url.includes('kenh14.vn') || url.includes('saostar.vn'))) {
            return res.status(400).json({
                success: false,
                error: 'URL phải từ kenh14.vn hoặc saostar.vn'
            });
        }

        console.log(`Scraping: ${url}`);

        const result = await scrapeArticle(url);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy nội dung bài viết'
            });
        }

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Scrape error:', errorMessage);

        let errorMsg = 'Lỗi khi lấy dữ liệu';
        if (error.code === 'ENOTFOUND') {
            errorMsg = 'URL không hợp lệ hoặc không thể truy cập';
        } else if (error.code === 'ECONNREFUSED') {
            errorMsg = 'Không thể kết nối đến trang web';
        } else if (errorMessage.toLowerCase().includes('timeout')) {
            errorMsg = 'Kết nối quá chậm (timeout 30s). Vui lòng kiểm tra kết nối internet hoặc thử lại sau.';
        }

        res.status(500).json({
            success: false,
            error: errorMsg
        });
    }
});

// ============================================================
// SUMMARIZE ENDPOINT
// ============================================================

app.post('/api/summarize', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Nội dung là bắt buộc'
            });
        }

        console.log(`Summarizing with Gemini...`);

        // Tạo prompt theo yêu cầu
        const prompt = `Role: Bạn là một Biên tập viên tin tức dày dặn kinh nghiệm, chuyên sáng tạo nội dung "tin nhanh" xu hướng trên mạng xã hội. Phong cách viết: Sắc sảo, gãy gọn, giàu thông tin và đúng văn phong báo chí hiện đại.
            Task: Tóm tắt bài báo được cung cấp bên dưới thành đúng 3 đoạn nội dung (Mở - Thân - Kết).
            YÊU CẦU KỸ THUẬT BẮT BUỘC:
            1. Định dạng cấu trúc: 
            - Chỉ xuất ra đúng 3 đoạn văn. KHÔNG thêm tiêu đề "Mở/Thân/Kết", KHÔNG thêm lời mở đầu hay lời kết của AI (ví dụ: Không ghi "Đây là tóm tắt của bạn...").
            - MỘT ĐOẠN PHẢI CÓ ĐÚNG 3 CÂU (ngắt bằng dấu chấm). Không viết 1 câu, không viết 2 câu, bắt buộc phải là 3 câu/đoạn. Mỗi câu trung bình từ 15-20 từ.

            2. Văn phong & Biên tập:
            - Sử dụng ngôn ngữ báo chí hiện đại, giật tít ngầm, loại bỏ hoàn toàn từ thừa. Tập trung làm nổi bật thông điệp chính của tiêu đề.

            3. Bộ lọc kiểm duyệt (Tránh vi phạm chính sách TikTok):
            - Tự động quét và thay thế tất cả các từ nhạy cảm bằng từ đồng nghĩa hoặc nói giảm nói tránh. Ví dụ: "giết/sát hại" -> "tiễn/lấy đi mạng sống", "lừa đảo/chiếm đoạt" -> "chiêu trò gian lận/vây bẫy tài chính", "máu" -> "vết đỏ", "bắt giam/tội phạm" -> "vướng vòng lao lý/đối tượng".

            CẤU TRÚC CHI TIẾT TỪNG ĐOẠN:
            - Đoạn 1 (3 câu): Trực diện, nêu bật sự kiện nóng nhất hoặc con số gây sốc nhất ngay câu đầu tiên.
            - Đoạn 2 (3 câu): Đưa ra 2-3 chi tiết đắt giá nhất từ nội dung bài báo để làm rõ bản chất vấn đề.
            - Đoạn 3 (3 câu): Đưa ra góc nhìn tổng kết, lời cảnh báo hoặc dự báo diễn biến tiếp theo để tạo sự trọn vẹn (không kết cụt).

            NỘI DUNG BÀI BÁO CẦN TÓM TẮT:
            ${content}`;

        const text = await generateSummaryWithRetry(prompt);
        console.log(text);

        res.json({
            success: true,
            summary: text
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Gemini error:', errorMessage);

        let errorMsg = 'Lỗi khi tóm tắt với Gemini';

        const isRateLimitError = isRateLimitOrHighDemandError(error);

        if (errorMessage.toLowerCase().includes('no gemini api keys configured')) {
            errorMsg = 'Chưa cấu hình API key Gemini. Vui lòng thêm GEMINI_API_KEY hoặc GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.';
        } else if (error.response && error.response.status === 400) {
            errorMsg = 'API Key không hợp lệ. Vui lòng cấu hình GEMINI_API_KEY';
        } else if (isRateLimitError) {
            errorMsg = 'Tất cả API keys đã đạt giới hạn rate limit/quota hoặc Gemini đang quá tải. Vui lòng thử lại sau 30 giây hoặc nâng cấp gói dịch vụ';
        } else if (errorMessage.toLowerCase().includes('timeout')) {
            errorMsg = 'Gemini timeout. Vui lòng thử lại';
        }

        res.status(500).json({
            success: false,
            error: errorMsg
        });
    }
});

// ============================================================
// TRENDING ENDPOINTS
// ============================================================

app.get('/api/trending', async (req, res) => {
    // Nếu cache trống thì fetch ngay
    const cache = await getTrendingCache();
    if (!cache.updatedAt) {
        await updateTrendingData();
    }
    res.json({ success: true, ...(await getTrendingCache()) });
});

app.post('/api/trending/refresh', async (req, res) => {
    await updateTrendingData();
    res.json({ success: true, ...(await getTrendingCache()) });
});

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
app.post('/api/tts/convert', async (req, res) => {
    try {
        const { text, voice, speed } = req.body;

        // Validation
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Văn bản là bắt buộc'
            });
        }

        if (text.length > 50000) {
            return res.status(400).json({
                success: false,
                error: 'Văn bản không được vượt quá 50000 ký tự'
            });
        }

        if (!voice) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng chọn giọng đọc'
            });
        }

        console.log(`🎤 TTS Request - Text: "${text.substring(0, 50)}...", Voice: ${voice}, Speed: ${speed}`);

        // Call Viettel AI API
        // Note: You need to register at https://viettelai.vn to get a token
        const viettelToken = process.env.VIETTEL_TTS_TOKEN;

        if (!viettelToken) {
            console.warn('⚠️ VIETTEL_TTS_TOKEN không được cấu hình');
            return res.status(500).json({
                success: false,
                error: 'Dịch vụ TTS chưa được cấu hình. Vui lòng liên hệ admin.'
            });
        }

        const ttsResponse = await axios.post('https://viettelai.vn/tts/speech_synthesis', {
            text: text,
            voice: voice,
            speed: speed,
            tts_return_option: 3,
            token: viettelToken,
            without_filter: false
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Check if response is valid
        if (!ttsResponse.data || ttsResponse.data.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Không nhận được âm thanh từ API'
            });
        }

        // Set response headers for audio
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');

        // Send audio data
        res.send(ttsResponse.data);

        console.log('✅ TTS conversion successful');

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('TTS Error:', errorMessage);

        let errorMsg = 'Lỗi khi chuyển đổi thành âm thanh';

        if (errorMessage.includes('401') || errorMessage.includes('Unable to verify user')) {
            errorMsg = 'Token Viettel AI không hợp lệ. Vui lòng kiểm tra cấu hình.';
        } else if (errorMessage.includes('403')) {
            errorMsg = 'Bạn không có quyền truy cập dịch vụ TTS';
        } else if (errorMessage.includes('400')) {
            errorMsg = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại văn bản và giọng đọc.';
        } else if (errorMessage.includes('timeout')) {
            errorMsg = 'Kết nối tới Viettel AI quá chậm. Vui lòng thử lại';
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
            errorMsg = 'Không thể kết nối tới dịch vụ Viettel AI';
        }

        res.status(500).json({
            success: false,
            error: errorMsg
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📰 Kênh14 Scraper is ready!');
    console.log('⏰ Trending sẽ tự cập nhật lúc 8:00 SA mỗi ngày (giờ VN)');
});

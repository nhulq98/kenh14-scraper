const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// import cors from 'cors';
// import cheerio from 'cheerio';
// import path from 'path';
// import express from 'express';
// import axios from 'axios'; // Nếu bạn vẫn dùng axios ở chỗ khác
// import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Danh sách API keys
const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3
].filter(key => key); // Lọc bỏ các key undefined

if (apiKeys.length === 0) {
    console.warn('⚠️ Không tìm thấy bất kỳ Gemini API key nào. Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.');
}

let currentKeyIndex = 0;

// Hàm để lấy API key hiện tại
function getCurrentApiKey() {
    console.log(`🔑 Using API key ${currentKeyIndex + 1}/${apiKeys.length}`);
    return apiKeys[currentKeyIndex];
}

// Hàm để chuyển sang API key tiếp theo
function switchToNextApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`🔄 Switched to API key ${currentKeyIndex + 1}/${apiKeys.length} due to rate limit`);
}

function getErrorMessage(error) {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.response && error.response.data) {
        try {
            return typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data);
        } catch {
            return String(error.response.data);
        }
    }
    return String(error);
}

function isRateLimitOrHighDemandError(error) {
    const message = (error?.message || '').toLowerCase();
    const status = error?.response?.status;
    return (
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('too many requests') ||
        message.includes('quota exceeded') ||
        message.includes('quota') ||
        message.includes('service unavailable') ||
        message.includes('high demand')
    );
}

// Khởi tạo với API Key đầu tiên
const genAI = new GoogleGenerativeAI(getCurrentApiKey());

// Cấu hình model
const model = genAI.getGenerativeModel(
    { model: "gemini-2.5-flash-lite" }
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scrape endpoint
app.post('/api/scrape', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL là bắt buộc' 
            });
        }

        if (!url.includes('kenh14.vn')) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL phải từ kenh14.vn' 
            });
        }

        console.log(`Scraping: ${url}`);

        // Fetch with User-Agent (increased timeout to 30s)
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 30000,  // 30 seconds instead of 10
            maxRedirects: 5
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract title
        let title = '';
        
        // Try multiple selectors
        title = $('h1.fck_title').text().trim() ||
                $('h1').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                '';

        // Extract content
        let content = '';
        
        // Try primary selector
        let contentDiv = $('.fck_detail').first();
        
        if (!contentDiv.length) {
            contentDiv = $('.article-content').first();
        }
        
        if (!contentDiv.length) {
            contentDiv = $('article').first();
        }
        
        if (!contentDiv.length) {
            contentDiv = $('[itemtype*="Article"]').first();
        }

        // If still not found, try common patterns
        if (!contentDiv.length) {
            contentDiv = $('div[class*="content"]').first();
        }

        if (contentDiv.length) {
            // Get all paragraphs
            const paragraphs = contentDiv.find('p');
            
            if (paragraphs.length > 0) {
                paragraphs.each((i, el) => {
                    const text = $(el).text().trim();
                    if (text) {
                        content += text + '\n\n';
                    }
                });
            } else {
                // Fallback: get all text
                content = contentDiv.text().trim();
            }
        }

        // Combine and clean
        let fullContent = '';
        if (title) {
            fullContent = title + '\n' + content;
        } else {
            fullContent = content;
        }

        fullContent = fullContent
            .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
            .trim();

        if (!fullContent) {
            return res.status(404).json({ 
                success: false, 
                error: 'Không tìm thấy nội dung bài viết' 
            });
        }

        res.json({ 
            success: true, 
            title: title,
            content: fullContent,
            charCount: fullContent.length,
            wordCount: fullContent.split(/\s+/).filter(w => w).length
        });

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Scrape error:', errorMessage);
        
        let errorMsg = 'Lỗi khi lấy dữ liệu';
        if (error?.code === 'ENOTFOUND') {
            errorMsg = 'URL không hợp lệ hoặc không thể truy cập';
        } else if (error?.code === 'ECONNREFUSED') {
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

// Hàm để thử gọi API với retry và switch key
async function generateSummaryWithRetry(prompt, maxRetries = apiKeys.length) {
    if (apiKeys.length === 0) {
        throw new Error('No Gemini API keys configured. Please set GEMINI_API_KEY or GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.');
    }

    let attempts = 0;
    let lastError = null;

    console.log(`🚀 Starting Gemini API call with ${apiKeys.length} available keys (max retries: ${maxRetries})`);

    while (attempts < maxRetries) {
        try {
            // Cập nhật model với API key hiện tại
            const currentGenAI = new GoogleGenerativeAI(getCurrentApiKey());
            const currentModel = currentGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const result = await currentModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(`✅ Successfully generated summary using API key ${currentKeyIndex + 1}`);
            return text;
        } catch (error) {
            lastError = error;
            const errorMessage = getErrorMessage(error);
            console.error(`❌ Attempt ${attempts + 1}/${maxRetries} failed with API key ${currentKeyIndex + 1}:`, errorMessage);

            // Check for rate limit/quota/high demand errors
            const isRateLimitError = isRateLimitOrHighDemandError(error);

            if (isRateLimitError) {
                // Rate limit/quota hit or high demand service error, switch to next key
                switchToNextApiKey();
                attempts++;
                console.log(`⏳ Retrying with next API key... (${attempts}/${maxRetries})`);
                // Wait a bit before retrying (optional, but good practice)
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                // Other error, don't retry
                console.error(`💥 Non-retryable error encountered, stopping attempts`);
                throw error;
            }
        }
    }

    // If all retries failed
    console.error(`🚫 All ${maxRetries} attempts failed. Last error:`, getErrorMessage(lastError));
    throw lastError || new Error('Unknown Gemini error');
}

// Gemini Summarize endpoint
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
        } else if (error?.response && error.response.status === 400) {
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📰 Kênh14 Scraper is ready!');
});
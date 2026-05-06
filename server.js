// const express = require('express');
// const axios = require('axios');
// const cheerio = require('cheerio');
// const path = require('path');
// const cors = require('cors');

import cors from 'cors';
import cheerio from 'cheerio';
import path from 'path';
import express from 'express';
import axios from 'axios'; // Nếu bạn vẫn dùng axios ở chỗ khác
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

import { GoogleGenerativeAI } from "@google/generative-ai";

// Khởi tạo với API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        console.error('Scrape error:', error.message);
        
        let errorMsg = 'Lỗi khi lấy dữ liệu';
        if (error.code === 'ENOTFOUND') {
            errorMsg = 'URL không hợp lệ hoặc không thể truy cập';
        } else if (error.code === 'ECONNREFUSED') {
            errorMsg = 'Không thể kết nối đến trang web';
        } else if (error.message.includes('timeout')) {
            errorMsg = 'Kết nối quá chậm (timeout 30s). Vui lòng kiểm tra kết nối internet hoặc thử lại sau.';
        }

        res.status(500).json({ 
            success: false, 
            error: errorMsg 
        });
    }
});

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
        const prompt = `Persona: Bạn là một Biên tập viên tin tức dày dặn kinh nghiệm, chuyên sáng tạo nội dung "tin nhanh" xu hướng trên mạng xã hội. Phong cách viết: Sắc sảo, gãy gọn, giàu thông tin và đúng văn phong báo chí hiện đại.
            Task: Tóm tắt bài báo được cung cấp thành 3 đoạn nội dung (Mở - Thân - Kết).
            Yêu cầu kỹ thuật:
            Định dạng: Mỗi đoạn đúng 3 dòng. Không dùng tiêu đề "Mở/Thân/Kết".
            Văn phong: Sử dụng ngôn ngữ báo chí, loại bỏ từ ngữ thừa. Tập trung làm nổi bật thông điệp của tiêu đề.
            Kiểm duyệt: Tự động thay thế các từ nhạy cảm (vi phạm chính sách TikTok) bằng từ đồng nghĩa hoặc cách nói giảm nói tránh (Ví dụ: thay "giết" bằng "tiễn", "lừa đảo" bằng "chiêu trò gian lận", "máu" bằng "vết đỏ",...).
            Cấu trúc chi tiết:
            Đoạn 1: Trực diện, nêu bật sự kiện nóng nhất hoặc con số gây sốc nhất.
            Đoạn 2: Đưa ra 2-3 chi tiết đắt giá nhất từ nội dung bài báo để làm rõ vấn đề.
            Đoạn 3: Đưa ra góc nhìn tổng kết, lời cảnh báo hoặc dự báo diễn biến tiếp theo để tạo sự trọn vẹn (không kết cụt).
            Nội dung bài báo cần tóm tắt:
            ${content}`;
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(text);

            // Extract response
            // const summary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể tóm tắt';
    
            res.json({ 
                success: true, 
                summary: text
            });
        } catch (error) {
            console.error('Chi tiết lỗi 400:', error);
        }
    } catch (error) {
        console.error('Gemini error:', error.message);
        
        let errorMsg = 'Lỗi khi tóm tắt với Gemini';
        
        if (error.response?.status === 400) {
            errorMsg = 'API Key không hợp lệ. Vui lòng cấu hình GEMINI_API_KEY';
        } else if (error.response?.status === 429) {
            errorMsg = 'Quá nhiều requests. Vui lòng thử lại sau';
        } else if (error.message.includes('timeout')) {
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
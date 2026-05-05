const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

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

        // Fetch with User-Agent
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
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
            errorMsg = 'Kết nối bị timeout. Vui lòng thử lại';
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

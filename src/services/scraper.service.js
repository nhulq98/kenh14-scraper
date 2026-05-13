const axios = require('axios');
const cheerio = require('cheerio');

const AXIOS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
};

class ScraperService {
    /**
     * Safe fetch: trả về '' nếu lỗi thay vì throw
     */
    static async safeFetch(url, options = {}) {
        try {
            const res = await axios.get(url, {
                headers: AXIOS_HEADERS,
                timeout: 15000,
                maxRedirects: 5,
                ...options
            });
            return res.data;
        } catch (err) {
            console.warn(`⚠️  safeFetch failed for ${url}: ${err.message}`);
            return '';
        }
    }

    /**
     * Scrape bài viết từ URL
     */
    static async scrapeArticle(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 30000,
                maxRedirects: 5
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Extract title
            let title = '';
            title = $('h1.fck_title').text().trim() ||
                $('article h1').first().text().trim() ||
                $('h1').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                '';

            // Extract content
            let content = '';

            // Prefer saostar article body when available
            if (url.includes('saostar.vn')) {
                const articleBody = $('article').first();
                if (articleBody.length) {
                    content = articleBody.text().trim();
                }
            }

            // Try primary selector only if no content yet
            if (!content) {
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

                if (!contentDiv.length) {
                    contentDiv = $('div[class*="content"]').first();
                }

                if (contentDiv.length) {
                    const paragraphs = contentDiv.find('p');

                    if (paragraphs.length > 0) {
                        paragraphs.each((i, el) => {
                            const text = $(el).text().trim();
                            if (text) {
                                content += text + '\n\n';
                            }
                        });
                    } else {
                        content = contentDiv.text().trim();
                    }
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
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            if (!fullContent) {
                return null;
            }

            return {
                title,
                content: fullContent,
                charCount: fullContent.length,
                wordCount: fullContent.split(/\s+/).filter(w => w).length
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Extract date from article page
     */
    static async extractArticleDate(articleUrl) {
        try {
            const html = await this.safeFetch(articleUrl);
            if (!html) return null;

            const $ = cheerio.load(html);
            let dateStr = '';

            // Try Kenh14 specific selector first
            dateStr = $('span.kbwcm-time').attr('title') ||
                $('meta[property="article:published_time"]').attr('content') ||
                $('meta[name="publish_date"]').attr('content') ||
                $('meta[property="og:published_time"]').attr('content') ||
                $('time').attr('datetime') ||
                $('[class*="published"], [class*="date"], [class*="time"]').first().attr('datetime') ||
                '';

            if (dateStr) {
                const publishDate = new Date(dateStr);
                if (!isNaN(publishDate.getTime())) {
                    return publishDate.getTime();
                }
            }

            // Fallback: try to parse from text
            const timeText = $('time').first().text() ||
                $('[class*="published"]').first().text() ||
                $('[class*="date"]').first().text() ||
                $('span.kbwcm-time').first().text() || '';

            if (timeText.includes('vừa xong') || timeText.includes('Vừa xong')) return Date.now();
            if (timeText.includes('1 phút') || timeText.includes('vài phút')) return Date.now() - 5 * 60 * 1000;
            if (timeText.includes('1 giờ') || timeText.includes('vài giờ')) return Date.now() - 30 * 60 * 1000;
            if (timeText.includes('1 ngày') || timeText.includes('hôm qua')) return Date.now() - 24 * 60 * 60 * 1000;

            return null;
        } catch (err) {
            console.warn(`⚠️ Failed to extract date from ${articleUrl}:`, err.message);
            return null;
        }
    }
}

module.exports = ScraperService;

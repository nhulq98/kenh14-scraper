const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// Cache file path
const CACHE_DIR = path.join(__dirname, '../../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'trending.cache.json');
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 1 day in milliseconds

class TrendingService {
    constructor() {
        this.trendingCache = {
            people: [],
            updatedAt: null
        };
        // Dependency Injection references (we will import them or they should be static)
        this.scraperService = require('./scraper.service');
        this.geminiService = require('./gemini.service');
        this.statsService = require('./stats.service');
    }

    // Tạo thư mục cache nếu chưa tồn tại
    async ensureCacheDir() {
        try {
            await fs.mkdir(CACHE_DIR, { recursive: true });
        } catch (err) {
            console.warn('⚠️  Không thể tạo thư mục cache:', err.message);
        }
    }

    // Lưu cache vào file
    async saveCacheToFile(cacheData) {
        try {
            await this.ensureCacheDir();
            await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
            console.log('💾 Cache đã được lưu vào file');
        } catch (err) {
            console.warn('⚠️  Không thể lưu cache vào file:', err.message);
        }
    }

    // Kiểm tra cache file có hợp lệ hay không (chưa hết hạn)
    async isValidCacheFile() {
        try {
            const stats = await fs.stat(CACHE_FILE);
            const fileAge = Date.now() - stats.mtimeMs;
            return fileAge < CACHE_EXPIRE_TIME;
        } catch (err) {
            // File không tồn tại hoặc lỗi khác
            return false;
        }
    }

    // Đọc cache từ file
    async readCacheFromFile() {
        try {
            const isValid = await this.isValidCacheFile();
            if (isValid) {
                const data = await fs.readFile(CACHE_FILE, 'utf-8');
                const cache = JSON.parse(data);
                console.log('📖 Cache đã được đọc từ file');
                return cache;
            }
        } catch (err) {
            console.warn('⚠️  Không thể đọc cache từ file:', err.message);
        }
        return null;
    }

    // Xóa cache file cũ
    async deleteCacheFile() {
        try {
            await fs.unlink(CACHE_FILE);
            console.log('🗑️  Cache file cũ đã bị xóa');
        } catch (err) {
            // File không tồn tại là bình thường
        }
    }

    // Scrape tiêu đề bài viết từ Kenh14 star page
    async scrapeKenh14Headlines() {
        const html = await this.scraperService.safeFetch('https://kenh14.vn/star.chn');
        if (!html) return [];
        const $ = cheerio.load(html);
        const titles = [];

        $('h3.knc-title, h3.title, .item-title, .news-title, .box-category-item h3, .knc-box h3, h2.knc-title').each((i, el) => {
            const t = $(el).text().trim();
            if (t && t.length > 10) titles.push(t);
        });

        if (titles.length < 5) {
            $('h3').each((i, el) => {
                const t = $(el).text().trim();
                if (t && t.length > 10) titles.push(t);
            });
        }
        console.log(`📰 Kenh14 headlines: ${titles.length} titles`);
        return titles.slice(0, 30);
    }

    // Scrape tiêu đề từ Saostar
    async scrapeSaostarHeadlines() {
        const html = await this.scraperService.safeFetch('https://www.saostar.vn/giai-tri/');
        if (!html) return [];
        const $ = cheerio.load(html);
        const titles = [];
        $('h2, h3, .news-title, .article-title, .title').each((i, el) => {
            const t = $(el).text().trim();
            if (t && t.length > 10) titles.push(t);
        });
        console.log(`📰 Saostar headlines: ${titles.length} titles`);
        return titles.slice(0, 30);
    }

    // Dùng Gemini phân tích danh sách tiêu đề và trả về top 7 tên nhân vật
    async analyzeTop7PeopleWithGemini(allHeadlines) {
        if (allHeadlines.length === 0) {
            return ['Không có dữ liệu', '', '', '', '', '', ''];
        }

        const joined = allHeadlines.slice(0, 80).join('\n');
        const prompt = `Bạn là chuyên gia phân tích xu hướng mạng xã hội.
Dưới đây là danh sách các tiêu đề bài báo giải trí và trending searches Việt Nam thu thập trong 48h qua.

Nhiệm vụ: Phân tích và trả về ĐÚNG 7 tên nhân vật (ca sĩ, diễn viên, người nổi tiếng VN hoặc quốc tế) đang được nhắc đến nhiều nhất / đang hot nhất.

Quy tắc:
- Chỉ trả về MỘT JSON array, ví dụ: ["Tên 1", "Tên 2", "Tên 3", "Tên 4", "Tên 5", "Tên 6", "Tên 7"]
- Đúng 7 phần tử, không nhiều hơn không ít hơn
- Ưu tiên người có nhiều lần xuất hiện trong các tiêu đề
- Nếu không đủ 7 người rõ ràng, điền tên nổi tiếng nhất bạn xác định được
- KHÔNG giải thích, chỉ xuất ra JSON array

Dữ liệu:
${joined}`;

        try {
            const raw = await this.geminiService.generateSummaryWithRetry(prompt);
            // Tìm JSON array trong response
            const match = raw.match(/\[.*?\]/s);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    return parsed.slice(0, 7).map(n => String(n).trim());
                }
            }
        } catch (err) {
            console.warn('⚠️  Gemini people analysis failed:', err.message);
        }
        return ['Không xác định', '', '', '', '', '', ''];
    }

    // Scrape articles từ một trang, trả về [{title, url, source, date}]
    async scrapeArticlesFromSource(sourceUrl, sourceName, people) {
        const html = await this.scraperService.safeFetch(sourceUrl);
        if (!html) return [];
        const $ = cheerio.load(html);
        const results = [];
        const now = Date.now();
        const limit48h = 48 * 60 * 60 * 1000;

        // Lấy tất cả link có title
        $('a').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href') || '';
            if (!title || title.length < 15 || !href || href === '#') return;

            // Kiểm tra href hợp lệ
            let fullUrl = href;
            if (href.startsWith('/')) {
                const base = new URL(sourceUrl);
                fullUrl = `${base.protocol}//${base.host}${href}`;
            } else if (!href.startsWith('http')) {
                return;
            }

            // Kiểm tra có đề cập đến người nào trong top 5 không
            const titleLower = title.toLowerCase();
            const matched = people.some(p => {
                if (!p) return false;
                const nameLower = p.toLowerCase();
                if (titleLower.includes(nameLower)) {
                    return true;
                }
                const nameParts = nameLower.split(' ').filter(p => p.length > 0);
                if (nameParts.length > 1) {
                    return nameParts.every(part => titleLower.includes(part));
                }
                return false;
            });
            if (!matched) return;

            results.push({ title, url: fullUrl, source: sourceName });
        });

        // Filter by 48-hour window
        const filtered = [];
        for (const article of results) {
            const articleDate = await this.scraperService.extractArticleDate(article.url);
            if (articleDate && (now - articleDate) <= limit48h) {
                filtered.push({
                    title: article.title,
                    url: article.url,
                    source: article.source,
                    date: new Date(articleDate).toISOString()
                });
            }
        }

        return filtered.slice(0, 20);
    }

    // Lấy ALL bài báo cho mỗi người trong 48 giờ
    async fetchArticlesForPeople(people) {
        const sources = [
            { url: 'https://kenh14.vn/star.chn', name: 'Kenh14' },
            { url: 'https://www.saostar.vn/giai-tri/', name: 'Saostar' }
        ];

        const peopleArticles = [];

        for (const person of people) {
            if (!person) continue;

            const personArticles = [];

            for (const src of sources) {
                const articles = await this.scrapeArticlesFromSource(src.url, src.name, [person]);
                personArticles.push(...articles);
            }

            personArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
            const topArticles = personArticles.slice(0, 10);

            peopleArticles.push({
                person,
                articles: topArticles
            });

            console.log(`📄 ${person}: tìm được ${topArticles.length} bài báo`);
        }

        return peopleArticles;
    }

    // Hàm chính: cập nhật toàn bộ trending data
    async updateTrendingData() {
        console.log('🔄 Bắt đầu cập nhật trending data...');
        try {
            const [kenh14Headlines, saostarHeadlines] = await Promise.all([
                this.scrapeKenh14Headlines(),
                this.scrapeSaostarHeadlines()
            ]);

            const allHeadlines = [
                ...kenh14Headlines,
                ...saostarHeadlines
            ];

            console.log(`📊 Tổng số tiêu đề thu thập được: ${allHeadlines.length}`);

            const top7People = await this.analyzeTop7PeopleWithGemini(allHeadlines);
            console.log('🌟 Top 7 nhân vật:', top7People);

            const peopleWithStats = [];
            for (const person of top7People) {
                if (person) {
                    const stats = await this.statsService.getPeopleStats([person]);
                    if (stats.length > 0) {
                        peopleWithStats.push({
                            name: person,
                            stats: stats[0].stats
                        });
                    } else {
                        peopleWithStats.push({
                            name: person,
                            stats: {}
                        });
                    }
                }
            }
            console.log('📊 Đã fetch stats cho các nhân vật');

            const peopleArticles = await this.fetchArticlesForPeople(top7People);
            console.log(`📰 Tìm được articles cho ${peopleArticles.length} nhân vật`);

            const people = peopleWithStats.map(person => {
                const articleData = peopleArticles.find(pa => pa.person === person.name);
                return {
                    ...person,
                    articles: articleData ? articleData.articles : []
                };
            });

            this.trendingCache = {
                people: people,
                updatedAt: new Date().toISOString()
            };

            await this.saveCacheToFile(this.trendingCache);

            console.log('✅ Trending data đã cập nhật thành công!');
        } catch (err) {
            console.error('❌ Lỗi cập nhật trending:', err.message);
        }
    }

    // Lấy cache hiện tại (từ file nếu có, không thì dùng memory)
    async getTrendingCache() {
        const fileCache = await this.readCacheFromFile();
        if (fileCache) {
            return fileCache;
        }
        return this.trendingCache;
    }
}

// Export a singleton instance
module.exports = new TrendingService();

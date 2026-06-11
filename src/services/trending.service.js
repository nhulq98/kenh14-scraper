const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// Cache file path
const CACHE_DIR = path.join(__dirname, '../../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'trending.cache.json');
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const BLACKLIST_KEYWORDS = [
    // === ĐÃ CÓ ===
    'ma túy', 'ma tuý', 'lừa đảo', 'bạo bệnh', 'tội ác',

    // === BỔ SUNG TỪ TIKTOK BAN LIST ===

    // Chất cấm / vũ khí
    'chất kích thích', 'chất cấm', 'cần sa', 'heroin', 'coke',
    'súng', 'vũ khí', 'đạn',

    // Bạo lực / tự hại
    'tự tử', 'tự vẫn', 'tự sát', 'quyên sinh',
    'hiếp dâm', 'xâm hại tình dục',
    'giết người', 'thảm sát',
    'tra tấn', 'hành hạ',

    // Nội dung 18+ / khiêu dâm
    'khiêu dâm', 'sex tape', 'lộ hàng', 'nội dung người lớn',

    // Cờ bạc
    'cờ bạc', 'cá độ', 'xổ số', 'sòng bạc', 'casino',

    // Phân biệt / kích động
    'phân biệt chủng tộc', 'kỳ thị',
    'khủng bố', 'kích động bạo lực',
];

const WHITELIST_KEYWORDS = [
    // quan hệ / tình cảm drama
    'chia tay', 'ly hôn', 'ngoại tình', 'tiểu tam', 'tranh sủng',
    'hẹn hò', 'đời tư', 'tình thật', 'phim giả', 'lời thề',
    // scandal / bê bối
    'bê bối', 'scandal', 'bị tố', 'phân trần', 'lên tiếng',
    'đáp trả', 'phủ nhận', 'thừa nhận', 'xin lỗi', 'tẩy chay',
    'vạch mặt', 'chỉ trích', 'tranh cãi', 'ồn ào', 'sốc',
    'phong sát', 'cắt sóng', 'bại lộ',
    // tiết lộ / lộ diện
    'lộ', 'tiết lộ', 'bắt gặp', 'bằng chứng', 'dấu hiệu',
    'nghi vấn', 'tung tích', 'soi', 'cam thường', 'mặt mộc',
    // drama gia đình / tài sản
    'đại gia', 'hào môn', 'tài phiệt', 'thừa kế', 'tranh giành',
    'biến mất', 'xé toạc', 'đối đầu', 'hầu tòa', 'ra tòa',
    'lao lý', 'bị bắt',
    // sức khỏe / sinh con
    'mang thai', 'nan y', 'bệnh hiểm', 'phẫu thuật',
    // chỉ trích / drama mạng
    'gán mác', 'khoe khoang', 'xin bỏ', 'bỏ họ',
    'tức giận', 'thịnh nộ', 'bức xúc', 'căng thẳng',
    // misc drama
    'bí mật', 'gây bão', 'cuộc chiến', 'tan nát', 'sự thật',
    'công khai', 'tố', // giữ nhưng sẽ dùng exclusion rule bên dưới
    'bóc phốt', 'dính phốt', 'phốt',
    'cắm sừng', 'lùm xùm', 'thị phi',
    'ngoài luồng', 'con ngoài giá thú',
    'khởi kiện', 'kiện ngược', 'vành móng ngựa',
    'twist', 'đăng đàn', 'unfollow',
    'úp mở', 'ẩn ý', 'quay lưng',
    'sụp đổ', 'mất trắng', 'tủi nhục',
    'biệt phủ', 'biệt thự', 'cơ ngơi',
    'từng phải', 'lột xác',
    'lọt top', 'lọt danh sách',
];

// Các pattern bị loại dù có keyword whitelist
const FALSE_POSITIVE_PATTERNS = [
    /tố cáo/,
    /gây sốt.*(trang phục|visual|ảnh|bộ ảnh|hình ảnh)/,
    /gây sốt.*(phim|mv|ca khúc|nhạc|bài hát|ost)/,
    /gây sốt.*(màn trình diễn|biểu diễn|sân khấu|concert|fan meeting)/,
    /gây sốt.*(sân bay|street style|outfit|look)/,
    /gây sốt.*(body|vóc dáng|thân hình|chiều cao)/,
    /(đăng quang|đoạt giải|nhận giải|giành giải).*(hoa hậu|á hậu|giải thưởng)/,
    /tổ chức (fan meeting|concert|showcase|event)/,
    /ra mắt (mv|ca khúc|album|phim|trailer)/,
    /tham dự (sự kiện|thảm đỏ|lễ trao giải)/,
    /lịch chiếu|khởi chiếu|công chiếu/,
    /sĩ tử|tốt nghiệp thpt|kỳ thi/,
    /world cup|bóng đá|tuyển quốc gia/,
    /đỗ tiến sĩ|bảo vệ luận văn/,
    /hôn nhân (viên mãn|hạnh phúc|bình yên)/,
    /đi du lịch.*(cùng gia đình|cùng vợ con|cùng bạn bè)/,
    /chia sẻ bí quyết (giảm cân|làm đẹp|giữ dáng)/,
    ];

const KEYWORD_WEIGHTS = {
    // Tier 1 — drama nặng (5đ)
    'bóc phốt':     5, 'cắm sừng':    5, 'ngoại tình':  5, 'tiểu tam':    5,
    'bê bối':       5, 'scandal':     5, 'lùm xùm':     5, 'bị tố':       5,
    'cắt sóng':     5, 'phong sát':   5, 'lao lý':      5, 'bị bắt':      5,
    'ly hôn':       5, 'chia tay':    5, 'dính phốt':   5, 'phốt':        5,
    'cắm sừng':     5, 'ngoài luồng': 5, 'con ngoài giá thú': 5,
    'khởi kiện':    5, 'kiện ngược':  5, 'vành móng ngựa': 5,
    'sụp đổ':       5, 'mất trắng':   5,

    // Tier 2 — drama trung bình (3đ)
    'lộ':           3, 'tiết lộ':     3, 'bắt gặp':     3, 'bằng chứng':  3,
    'lên tiếng':    3, 'phủ nhận':    3, 'thừa nhận':   3, 'xin lỗi':     3,
    'tranh cãi':    3, 'ồn ào':       3, 'sốc':         3, 'gây bão':     3,
    'đại gia':      3, 'tài phiệt':   3, 'hào môn':     3, 'thừa kế':     3,
    'tranh giành':  3, 'biến mất':    3, 'xé toạc':     3, 'đối đầu':     3,
    'hầu tòa':      3, 'ra tòa':      3, 'tủi nhục':    3, 'thị phi':     3,
    'bí mật':       3, 'nghi vấn':    3, 'tung tích':   3, 'vạch mặt':    3,
    'chỉ trích':    3, 'tẩy chay':    3, 'đáp trả':     3, 'phân trần':   3,
    'bùng binh':    3, 'twist':       3, 'đăng đàn':    3, 'quay lưng':   3,
    'gán mác':      3, 'khoe khoang': 3, 'xin bỏ':      3, 'bỏ họ':       3,
    'biệt phủ':     3, 'biệt thự':    3, 'từng phải':   3, 'lọt top':     3,
    'mang thai':    3, 'dấu hiệu':    3, 'bầu':         3,

    // Tier 3 — signal yếu (1đ)
    'công khai':    1, 'lộ diện':     1, 'soi':         1, 'cam thường':  1,
    'gây sốt':      1, 'trending':    1, 'phản ứng':    1, 'lên tiếng':   1,
    'tố':           1, 'unfollow':    1, 'úp mở':       1, 'ẩn ý':        1,
    'động thái':    1, 'căng thẳng':  1, 'cuộc chiến':  1,
    };

class TrendingService {
    constructor() {
        this.trendingCache = {
            people: [],
            hotArticles: [],  // Hot articles list (consolidated from getHotArticles)
            headlines: null,  // Store scraped headlines to avoid re-scraping
            updatedAt: null
        };
        // Dependency Injection references (we will import them or they should be static)
        this.scraperService = require('./scraper.service');
        this.geminiService = require('./gemini.service');
        this.statsService = require('./stats.service');
        
        // Lock mechanism to prevent concurrent updates
        this.isUpdating = false;
        this.updatePromise = null;
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
    // Sử dụng Puppeteer với lazy loading support
    async scrapeKenh14Headlines() {
        console.log('⏳ Fetching Kenh14 with lazy load support...');
        
        // Thử lấy với Puppeteer (lazy loading)
        const html = await this.scraperService.fetchWithLazyLoad('https://kenh14.vn/star.chn', {
            scrollDelay: 6000,
            scrollPause: 6000,
            maxScrolls: 20,
            // New options for additional content loading
            clickLoadMore: true,  // Click "Bấm để xem thêm" button
            callLoadListDetail: true,  // Call LoadListDetail() function
            scrollToBottom: true,  // Scroll all the way to bottom
            additionalScrolls: 10  // Additional scroll cycles after LoadListDetail
        });

        if (!html) {
            console.warn('⚠️  Puppeteer fetch failed, fallback to safeFetch');
            const fallbackHtml = await this.scraperService.safeFetch('https://kenh14.vn/star.chn');
            if (!fallbackHtml) return [];
            return this._extractHeadlinesFromHtml(fallbackHtml);
        }

        return this._extractHeadlinesFromHtml(html);
    }

    // Helper: Extract headlines từ HTML - FOCUSED extraction (now returns {title, href})
    _extractHeadlinesFromHtml(html) {
        const $ = cheerio.load(html);
        const titles = new Set();  // Use Set để tránh duplicate
        const articles = [];  // Array to store {title, href} objects

        // PRIMARY: Extract ONLY from role="article" elements (most reliable)
        $('[role="article"]').each((i, el) => {
            const $el = $(el);
            
            // Look for title in heading tags first
            let headline = $el.find('h1, h2, h3, h4, h5, h6').first().text().trim();
            let href = '';
            
            // If found in heading, get the href from the heading's link
            if (headline) {
                href = $el.find('h1, h2, h3, h4, h5, h6').first().find('a').first().attr('href') || '';
            }
            
            // If not found, try title attribute from any element with title
            if (!headline) {
                const titleEl = $el.find('[title]').first();
                headline = titleEl.attr('title')?.trim();
                href = titleEl.is('a') ? titleEl.attr('href') || '' : '';
            }
            
            // If not found, try data-title attribute
            if (!headline) {
                headline = $el.find('[data-title]').first().attr('data-title')?.trim();
            }
            
            // If not found, look for link text (usually in <a> tag)
            if (!headline) {
                const linkEl = $el.find('a').first();
                headline = linkEl.attr('title')?.trim() || linkEl.find('h4, h3, h2').first().text().trim();
                href = linkEl.attr('href') || '';
            }
            
            if (headline && headline.length > 10 && headline.length < 500 && !titles.has(headline)) {
                titles.add(headline);
                articles.push({
                    title: headline,
                    href: "http://kenh14.vn"+href
                });
            }
        });

        // FALLBACK: If no articles found with role="article", extract from article containers
        if (articles.length === 0) {
            $('article, .article, .news-item, .post, .story, .item-card, .news-card').each((i, el) => {
                const $el = $(el);
                let headline = $el.find('h1, h2, h3, h4, .title, .headline').first().text().trim();
                let href = '';
                
                if (headline) {
                    href = $el.find('h1, h2, h3, h4, .title, .headline').first().find('a').first().attr('href') || '';
                }
                
                if (!headline) {
                    const linkEl = $el.find('a').first();
                    headline = linkEl.attr('title')?.trim();
                    href = linkEl.attr('href') || '';
                }
                
                if (headline && headline.length > 10 && headline.length < 500 && !titles.has(headline)) {
                    titles.add(headline);
                    articles.push({
                        title: headline,
                        href: href
                    });
                }
            });
        }

        // Filter out noise
        const filtered = articles.filter(item => {
            const t = item.title;
            return t && 
                   !t.includes('onclick') && 
                   !t.includes('© ') &&
                   !t.includes('...') &&
                   !t.toLowerCase().includes('login') &&
                   !t.toLowerCase().includes('đăng nhập') &&
                   !t.toLowerCase().includes('subscribe') &&
                   !t.toLowerCase().includes('copyright') &&
                   !t.toLowerCase().includes('bình luận') &&
                   !t.includes('if (typeof') &&
                   !t.includes('admicro') &&
                   t.split(' ').length > 2; // At least 3 words
        });

        console.log(`📰 Kenh14 headlines: ${filtered.length} titles (after lazy load + focused extraction)`);
        
        // Return articles with title and href
        return filtered.slice(0, 150);
    }

    // Scrape tiêu đề từ Saostar
    async scrapeSaostarHeadlines() {
        const html = await this.scraperService.safeFetch('https://www.saostar.vn/giai-tri/');
        if (!html) return [];
        const $ = cheerio.load(html);
        const articles = [];
        const titles = new Set();
        
        // Extract headings with their links
        $('h2, h3, .news-title, .article-title, .title').each((i, el) => {
            const $el = $(el);
            const t = $el.text().trim();
            const href = $el.closest('a').attr('href') || $el.find('a').first().attr('href') || '';
            
            if (t && t.length > 10 && !titles.has(t)) {
                titles.add(t);
                articles.push({
                    title: t,
                    href: href
                });
            }
        });
        
        console.log(`📰 Saostar headlines: ${articles.length} titles`);
        return articles.slice(0, 30);
    }

    // Dùng Gemini phân tích danh sách tiêu đề và trả về top 7 tên nhân vật
    async analyzeTop7PeopleWithGemini(allHeadlines) {
        if (allHeadlines.length === 0) {
            return ['Không có dữ liệu', '', '', '', '', '', ''];
        }

        const joined = allHeadlines.slice(0, 80).join('\n');
        const prompt = `
            Dưới đây là danh sách các tiêu đề bài báo giải trí.

            Nhiệm vụ: Phân tích và trả về ĐÚNG 7 tên nhân vật có tần suất xuất hiện trong các tiêu đề cao nhất.

            Quy tắc:
            - Chỉ trả về MỘT JSON array, ví dụ: ["Tên 1", "Tên 2", "Tên 3", "Tên 4", "Tên 5", "Tên 6", "Tên 7"]
            - Đúng 7 phần tử, không nhiều hơn không ít hơn
            - Sắp xếp theo người có số lần xuất hiện nhiều nhất đến thấp nhất từ trên xuống dưới trong top 7
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
                
                // Exact match: full name
                if (titleLower.includes(nameLower)) {
                    return true;
                }
                
                // Split name into parts and check if ALL meaningful parts appear (> 2 chars)
                const nameParts = nameLower.split(' ').filter(p => p.length > 2);
                if (nameParts.length > 0) {
                    // Match ONLY if ALL name parts appear (stricter matching)
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

    // Lấy ALL bài báo cho mỗi người từ extracted headline list
    async fetchArticlesForPeople(people, extractedHeadlines) {
        const peopleArticles = [];
        
        // extractedHeadlines format: {kenh14: [{title, href, source: 'Kenh14'}, ...], saostar: [...]} 
        const allArticles = [
            ...(extractedHeadlines.kenh14 || []),
            ...(extractedHeadlines.saostar || [])
        ];

        for (const person of people) {
            if (!person) continue;

            const personArticles = [];
            const personNameLower = person.toLowerCase();

            // Find all articles matching this person
            for (const article of allArticles) {
                const titleLower = article.title.toLowerCase();

                // Exact match: full name
                if (titleLower.includes(personNameLower)) {
                    personArticles.push(article);
                    continue;
                }
                
                // Split name into parts and check if ALL meaningful parts appear (> 2 chars)
                const nameParts = personNameLower.split(' ').filter(p => p.length > 2);
                if (nameParts.length > 0) {
                    // Match ONLY if ALL name parts appear (stricter matching)
                    if (nameParts.every(part => titleLower.includes(part))) {
                        personArticles.push(article);
                    }
                }
            }

            // Remove duplicates and take top 10
            const uniqueArticles = [];
            const seenUrls = new Set();
            for (const article of personArticles) {
                if (!seenUrls.has(article.href)) {
                    seenUrls.add(article.href);
                    uniqueArticles.push(article);
                }
            }
            
            const topArticles = uniqueArticles.slice(0, 10);

            peopleArticles.push({
                person,
                articles: topArticles
            });

            console.log(`📄 ${person}: tìm được ${topArticles.length} bài báo từ extracted headlines`);
        }

        return peopleArticles;
    }

    // Lấy danh sách bài báo hot dựa trên Gemini analysis
    async getHotArticlesWithKeyWord(allHeadlines) {
        

        const headlines = allHeadlines;

        const norm = s => s.toLowerCase();
        return headlines.filter(title => {
            const t = norm(title);
            if (BLACKLIST_KEYWORDS.some(kw => t.includes(kw))) return false;
            if (FALSE_POSITIVE_PATTERNS.some(re => re.test(t))) return false;
            return WHITELIST_KEYWORDS.some(kw => t.includes(kw));
        });
    }

    // Hàm chính: cập nhật toàn bộ trending data
    async updateTrendingData() {
        // Prevent concurrent updates - if update is already in progress, wait for it
        if (this.isUpdating) {
            console.log('⏳ Update đang chạy, đợi kết quả...');
            return this.updatePromise;
        }

        // Mark as updating and create a promise for other requests to wait on
        this.isUpdating = true;
        this.updatePromise = this._performTrendingUpdate();
        
        try {
            await this.updatePromise;
        } finally {
            // Reset the lock after update completes
            this.isUpdating = false;
            this.updatePromise = null;
        }
    }

    filterHotArticles(headlines) {
        const norm = s => s.toLowerCase();
        return headlines.filter(title => {
            const t = norm(title);
            if (BLACKLIST_KEYWORDS.some(kw => t.includes(kw))) return false;
            if (FALSE_POSITIVE_PATTERNS.some(re => re.test(t))) return false;
            return Object.keys(KEYWORD_WEIGHTS).some(kw => t.includes(kw));
        });
    }

    scoreTitle(title) {
        const t = title.toLowerCase();
        return Object.entries(KEYWORD_WEIGHTS)
            .reduce((score, [kw, weight]) => t.includes(kw) ? score + weight : score, 0);
    }

    getHotArticlesSorted(headlines) {
        return this.filterHotArticles(headlines)
            .map(title => ({ title, score: this.scoreTitle(title) }))
            .sort((a, b) => b.score - a.score)
            .map(({ title, score }) => ({ title, score })); // giữ score để debug
    }

    // Helper method: Thực hiện cập nhật trending data
    async _performTrendingUpdate() {
        console.log('🔄 Bắt đầu cập nhật trending data...');
        try {
            const [kenh14Headlines, saostarHeadlines] = await Promise.all([
                this.scrapeKenh14Headlines(),
                this.scrapeSaostarHeadlines()
            ]);

            // Add source name to each article
            const kenh14WithSource = kenh14Headlines.map(item => ({ ...item, source: 'Kenh14' }));
            const saostarWithSource = saostarHeadlines.map(item => ({ ...item, source: 'Saostar' }));
            
            const allHeadlineTitles = [
                ...kenh14Headlines.map(item => item.title),
                ...saostarHeadlines.map(item => item.title)
            ];

            console.log(`📊 Tổng số tiêu đề thu thập được: ${allHeadlineTitles.length}`);

            const top7People = await this.analyzeTop7PeopleWithGemini(allHeadlineTitles);
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

            // Use extracted headlines list instead of scraping sources
            const extractedHeadlines = {
                kenh14: kenh14WithSource,
                saostar: saostarWithSource
            };
            const peopleArticles = await this.fetchArticlesForPeople(top7People, extractedHeadlines);
            console.log(`📰 Tìm được articles cho ${peopleArticles.length} nhân vật`);

            const people = peopleWithStats.map(person => {
                const articleData = peopleArticles.find(pa => pa.person === person.name);
                return {
                    ...person,
                    articles: articleData ? articleData.articles : []
                };
            }).sort((a, b) => b.articles.length - a.articles.length);

            // Extract hot articles from headlines
            const hotTitles = this.getHotArticlesSorted(allHeadlineTitles);
            console.log(`🔥 Tìm được ${hotTitles.length} bài báo hot`);

            // Map hot titles to include URLs and source
            let hotArticles = [];
            hotArticles = hotTitles.map(title => {
                const kenh14Match = kenh14Headlines.find(item => item.title === title.title);
                if (kenh14Match) {
                    return {
                        title: title.title,
                        url: kenh14Match.href,
                        source: 'Kenh14'
                    };
                }

                const saostarMatch = saostarHeadlines.find(item => item.title === title.title);
                if (saostarMatch) {
                    return {
                        title: title.title,
                        url: saostarMatch.href,
                        source: 'Saostar'
                    };
                }

                return null;
            }).filter(Boolean);

            this.trendingCache = {
                people: people,
                hotArticles: hotArticles,  // Store extracted hot articles
                headlines: {  // Store headlines to avoid re-scraping in getHotArticles()
                    kenh14: kenh14Headlines,
                    saostar: saostarHeadlines,
                    allTitles: allHeadlineTitles
                },
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

    // Lấy danh sách bài báo hot (mới)
    // @param {boolean} refresh - If true, bypass cache and refresh from updateTrendingData
    async getHotArticles(refresh = false) {
        try {
            // If refresh is enabled, call updateTrendingData to get fresh data
            if (refresh) {
                console.log('🔄 Refresh mode: fetching fresh trending data...');
                await this.updateTrendingData();
            }

            // Get cache (either fresh from updateTrendingData or from file)
            const cache = await this.getTrendingCache();

            // Return cached hot articles
            if (cache.hotArticles && cache.hotArticles.length > 0) {
                console.log(`✅ Returning hot articles (${cache.hotArticles.length} articles)`);
                return {
                    articles: cache.hotArticles,
                    updatedAt: cache.updatedAt,
                    fromCache: true
                };
            }

            // If no hot articles in cache, return empty
            console.log('⚠️  No hot articles in cache');
            return {
                articles: [],
                updatedAt: cache.updatedAt || new Date().toISOString()
            };
        } catch (err) {
            console.error('❌ Lỗi lấy hot articles:', err.message);
            return {
                articles: [],
                updatedAt: new Date().toISOString()
            };
        }
    }
}

// Export a singleton instance
module.exports = new TrendingService();

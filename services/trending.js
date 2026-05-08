const cheerio = require('cheerio');
const { safeFetch, extractArticleDate } = require('./scraper');
const { generateSummaryWithRetry } = require('./gemini');

// In-memory cache
let trendingCache = {
    people: [],
    articles: [],
    updatedAt: null
};

// Lấy top trending searches từ Google Trends RSS (VN)
async function fetchGoogleTrendsVN() {
    const url = 'https://trends.google.com/trending/rss?geo=VN';
    const xml = await safeFetch(url);
    if (!xml) return [];

    const $ = cheerio.load(xml, { xmlMode: true });
    const titles = [];
    $('item title').each((i, el) => {
        const t = $(el).text().trim();
        if (t) titles.push(t);
    });
    console.log(`📊 Google Trends VN: ${titles.slice(0, 10).join(', ')}`);
    return titles.slice(0, 30);
}

// Scrape tiêu đề bài viết từ Kenh14 star page
async function scrapeKenh14Headlines() {
    const html = await safeFetch('https://kenh14.vn/star.chn');
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
async function scrapeSaostarHeadlines() {
    const html = await safeFetch('https://www.saostar.vn/giai-tri/');
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

// Dùng Gemini phân tích danh sách tiêu đề và trả về top 5 tên nhân vật
async function analyzeTop5PeopleWithGemini(allHeadlines) {
    if (allHeadlines.length === 0) {
        return ['Không có dữ liệu', '', '', '', ''];
    }

    const joined = allHeadlines.slice(0, 80).join('\n');
    const prompt = `Bạn là chuyên gia phân tích xu hướng mạng xã hội.
Dưới đây là danh sách các tiêu đề bài báo giải trí và trending searches Việt Nam thu thập trong 48h qua.

Nhiệm vụ: Phân tích và trả về ĐÚNG 5 tên nhân vật (ca sĩ, diễn viên, người nổi tiếng VN hoặc quốc tế) đang được nhắc đến nhiều nhất / đang hot nhất.

Quy tắc:
- Chỉ trả về MỘT JSON array, ví dụ: ["Tên 1", "Tên 2", "Tên 3", "Tên 4", "Tên 5"]
- Đúng 5 phần tử, không nhiều hơn không ít hơn
- Ưu tiên người có nhiều lần xuất hiện trong các tiêu đề
- Nếu không đủ 5 người rõ ràng, điền tên nổi tiếng nhất bạn xác định được
- KHÔNG giải thích, chỉ xuất ra JSON array

Dữ liệu:
${joined}`;

    try {
        const raw = await generateSummaryWithRetry(prompt);
        // Tìm JSON array trong response
        const match = raw.match(/\[.*?\]/s);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
                return parsed.slice(0, 5).map(n => String(n).trim());
            }
        }
    } catch (err) {
        console.warn('⚠️  Gemini people analysis failed:', err.message);
    }
    return ['Không xác định', '', '', '', ''];
}

// Scrape articles từ một trang, trả về [{title, url, source, date}]
async function scrapeArticlesFromSource(sourceUrl, sourceName, people) {
    const html = await safeFetch(sourceUrl);
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
        const matched = people.some(p => p && titleLower.includes(p.toLowerCase().split(' ').pop()));
        if (!matched) return;

        results.push({ title, url: fullUrl, source: sourceName });
    });

    // Filter by 48-hour window
    const filtered = [];
    for (const article of results) {
        const articleDate = await extractArticleDate(article.url);
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

// Thu thập top 5 bài viết liên quan đến các nhân vật hot
async function fetchTop5Articles(people) {
    const sources = [
        { url: 'https://kenh14.vn/star.chn', name: 'Kenh14' },
        { url: 'https://www.saostar.vn/giai-tri/', name: 'Saostar' },
        { url: 'https://www.theanh28entertainment.com/', name: 'Theanh28' },
        { url: 'https://beatvn.com/', name: 'BeatVN' },
        { url: 'https://www.yan.vn/entertainment/', name: 'YAN News' }
    ];

    let allArticles = [];

    for (const src of sources) {
        if (allArticles.length >= 5) break;
        const articles = await scrapeArticlesFromSource(src.url, src.name, people);
        allArticles = [...allArticles, ...articles];
        console.log(`📄 ${src.name}: ${articles.length} matched articles`);
    }

    // Dedupe by URL
    const seen = new Set();
    const unique = allArticles.filter(a => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
    });

    return unique.slice(0, 5);
}

// Hàm chính: cập nhật toàn bộ trending data
async function updateTrendingData() {
    console.log('🔄 Bắt đầu cập nhật trending data...');
    try {
        // Thu thập dữ liệu song song
        const [googleTrends, kenh14Headlines, saostarHeadlines] = await Promise.all([
            fetchGoogleTrendsVN(),
            scrapeKenh14Headlines(),
            scrapeSaostarHeadlines()
        ]);

        const allHeadlines = [
            ...googleTrends,
            ...kenh14Headlines,
            ...saostarHeadlines
        ];

        console.log(`📊 Tổng số tiêu đề thu thập được: ${allHeadlines.length}`);

        // Dùng Gemini xác định top 5 nhân vật
        const top5People = await analyzeTop5PeopleWithGemini(allHeadlines);
        console.log('🌟 Top 5 nhân vật:', top5People);

        // Tìm top 5 bài viết liên quan
        const top5Articles = await fetchTop5Articles(top5People);
        console.log(`📰 Top 5 articles: ${top5Articles.length} found`);

        // Cập nhật cache
        trendingCache = {
            people: top5People,
            articles: top5Articles,
            updatedAt: new Date().toISOString()
        };

        console.log('✅ Trending data đã cập nhật thành công!');
    } catch (err) {
        console.error('❌ Lỗi cập nhật trending:', err.message);
    }
}

// Lấy cache hiện tại
function getTrendingCache() {
    return trendingCache;
}

module.exports = {
    updateTrendingData,
    getTrendingCache,
    fetchGoogleTrendsVN,
    scrapeKenh14Headlines,
    scrapeSaostarHeadlines
};

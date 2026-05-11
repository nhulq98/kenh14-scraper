const cheerio = require('cheerio');
const { safeFetch, extractArticleDate } = require('./scraper');
const { generateSummaryWithRetry } = require('./gemini');
const { getPeopleStats } = require('./stats');

// In-memory cache
let trendingCache = {
    people: [],
    updatedAt: null
};

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

// Dùng Gemini phân tích danh sách tiêu đề và trả về top 7 tên nhân vật
async function analyzeTop7PeopleWithGemini(allHeadlines) {
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
        const raw = await generateSummaryWithRetry(prompt);
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
        // Check toàn bộ tên người
        const matched = people.some(p => {
            if (!p) return false;
            const nameLower = p.toLowerCase();
            // Chỉ match nếu:
            // 1. Toàn bộ tên xuất hiện trong title
            // 2. HOẶC tất cả các từ trong tên đều xuất hiện (đặc biệt cho tên 2-3 từ)
            if (titleLower.includes(nameLower)) {
                return true;
            }
            // Check nếu toàn bộ các từ trong tên đều có trong title
            const nameParts = nameLower.split(' ').filter(p => p.length > 0);
            if (nameParts.length > 1) {
                // Cho tên nhiều từ, cần tất cả từ xuất hiện
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

// Lấy ALL bài báo cho mỗi người trong 48 giờ
async function fetchArticlesForPeople(people) {
    const sources = [
        { url: 'https://kenh14.vn/star.chn', name: 'Kenh14' },
        { url: 'https://www.saostar.vn/giai-tri/', name: 'Saostar' }
    ];

    const peopleArticles = [];

    // Cho mỗi người, lấy TẤT CẢ bài báo từ các nguồn
    for (const person of people) {
        if (!person) continue;

        const personArticles = [];

        // Fetch từ tất cả nguồn
        for (const src of sources) {
            const articles = await scrapeArticlesFromSource(src.url, src.name, [person]);
            personArticles.push(...articles);
        }

        // Sort theo ngày mới nhất, limit top 10
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
async function updateTrendingData() {
    console.log('🔄 Bắt đầu cập nhật trending data...');
    try {
        // Thu thập dữ liệu song song từ Kenh14 và Saostar
        const [kenh14Headlines, saostarHeadlines] = await Promise.all([
            scrapeKenh14Headlines(),
            scrapeSaostarHeadlines()
        ]);

        const allHeadlines = [
            ...kenh14Headlines,
            ...saostarHeadlines
        ];

        console.log(`📊 Tổng số tiêu đề thu thập được: ${allHeadlines.length}`);

        // Dùng Gemini xác định top 7 nhân vật
        const top7People = await analyzeTop7PeopleWithGemini(allHeadlines);
        console.log('🌟 Top 7 nhân vật:', top7People);

        // Fetch stats cho mỗi nhân vật
        const peopleWithStats = [];
        for (const person of top7People) {
            if (person) {
                const stats = await getPeopleStats([person]);
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

        // Lấy TẤT CẢ bài báo cho mỗi người
        const peopleArticles = await fetchArticlesForPeople(top7People);
        console.log(`📰 Tìm được articles cho ${peopleArticles.length} nhân vật`);

        // Merge articles vào peopleWithStats
        const people = peopleWithStats.map(person => {
            const articleData = peopleArticles.find(pa => pa.person === person.name);
            return {
                ...person,
                articles: articleData ? articleData.articles : []
            };
        });

        // Cập nhật cache - chỉ lưu people, không cần articles array riêng
        trendingCache = {
            people: people,
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
    scrapeKenh14Headlines,
    scrapeSaostarHeadlines
};

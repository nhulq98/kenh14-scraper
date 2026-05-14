const cheerio = require('cheerio');
const { safeFetch, extractArticleDate } = require('./scraper');
const { generateSummaryWithRetry } = require('./gemini');
const { getPeopleStats } = require('./stats');

// In-memory cache
let trendingCache = {
    people: [],
    updatedAt: null
};

// Drama keywords tăng score
const DRAMA_KEYWORDS = [
    'ngoại tình', 'scandal', 'lên tiếng', 'bị tố', 'phản ứng',
    'bức xúc', 'chia tay', 'ly hôn', 'bị tấn công', 'đáp trả',
    'sự thật', 'bại lộ', 'gây tranh cãi', 'gây sốc', 'nước đi sai',
    'bị chỉ trích', 'xin lỗi', 'tẩy chay', 'bí mật', 'cãi nhau',
    'tức giận', 'vướng lao lý', 'bị bắt', 'phủ nhận', 'thừa nhận',
];

// ─── SCRAPE LISTING PAGES ────────────────────────────────────────────────────

async function scrapeListingPage(url) {
    const html = await safeFetch(url);
    if (!html) return [];
    const $ = cheerio.load(html);
    const articles = [];

    $('a').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (!title || title.length < 15 || !href || href === '#') return;

        let fullUrl = href;
        if (href.startsWith('/')) {
            const base = new URL(url);
            fullUrl = `${base.protocol}//${base.host}${href}`;
        } else if (!href.startsWith('http')) {
            return;
        }

        articles.push({ title, url: fullUrl });
    });

    // Deduplicate by URL
    const seen = new Set();
    return articles.filter(a => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
    });
}

async function scrapeKenh14Headlines() {
    const articles = await scrapeListingPage('https://kenh14.vn/star.chn');
    console.log(`📰 Kenh14 headlines: ${articles.length} articles`);
    return articles.map(a => ({ ...a, source: 'Kenh14' }));
}

async function scrapeSaostarHeadlines() {
    const articles = await scrapeListingPage('https://www.saostar.vn/giai-tri/');
    console.log(`📰 Saostar headlines: ${articles.length} articles`);
    return articles.map(a => ({ ...a, source: 'Saostar' }));
}

// ─── EXTRACT NAMES VIA GEMINI ────────────────────────────────────────────────
// Gemini chỉ làm 1 việc: extract tên từ danh sách tiêu đề
// KHÔNG để Gemini tự quyết định ai trending

async function extractNamesFromTitles(titles) {
    if (titles.length === 0) return [];

    const joined = titles.slice(0, 100).join('\n');
    const prompt = `Nhiệm vụ: Từ danh sách tiêu đề bài báo giải trí Việt Nam dưới đây, hãy extract TẤT CẢ tên người nổi tiếng được nhắc đến.

Quy tắc:
- Chỉ trả về JSON object, key là tên tiêu đề bài báo (nguyên văn), value là mảng tên người nổi tiếng trong bài đó
- Nếu tiêu đề không nhắc tên cụ thể, bỏ qua
- Tên phải là tên đầy đủ hoặc tên thường gọi phổ biến (ví dụ: "Lee Byung Hun", "Ngọc Trinh", "JustaTee")
- KHÔNG giải thích, chỉ xuất JSON

Ví dụ output:
{
  "Lee Byung Hun đã ngoại tình còn ra tối hậu thư cho vợ": ["Lee Byung Hun"],
  "Vợ JustaTee chơi pickleball sau sinh 2 tháng": ["JustaTee"],
  "Noo Phước Thịnh lên tiếng về clip liên quan Miu Lê": ["Noo Phước Thịnh", "Miu Lê"]
}

Danh sách tiêu đề:
${joined}`;

    try {
        const raw = await generateSummaryWithRetry(prompt);
        // Extract JSON từ response
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (err) {
        console.warn('⚠️ Gemini name extraction failed:', err.message);
    }
    return {};
}

// ─── FREQUENCY SCORING ───────────────────────────────────────────────────────

function calcDramaScore(title) {
    const lower = title.toLowerCase();
    return DRAMA_KEYWORDS.filter(kw => lower.includes(kw)).length;
}

function buildCelebRanking(allArticles, nameMap) {
    // nameMap: { title -> [names] }
    const celebMap = {}; // { name: { count, dramaScore, articles[] } }

    for (const article of allArticles) {
        const names = nameMap[article.title] || [];
        const dramaScore = calcDramaScore(article.title);

        for (const name of names) {
            if (!name || name.length < 2) continue;
            if (!celebMap[name]) {
                celebMap[name] = { count: 0, dramaScore: 0, articles: [] };
            }
            celebMap[name].count += 1;
            celebMap[name].dramaScore += dramaScore;
            // Lưu lại article để dùng cho dropdown
            celebMap[name].articles.push({
                title: article.title,
                url: article.url,
                source: article.source,
            });
        }
    }

    // score = frequency * 3 + dramaScore * 2
    return Object.entries(celebMap)
        .map(([name, data]) => ({
            name,
            score: data.count * 3 + data.dramaScore * 2,
            articleCount: data.count,
            dramaScore: data.dramaScore,
            rawArticles: data.articles,
        }))
        .sort((a, b) => b.score - a.score);
}

// ─── FILTER ARTICLES BY DATE ─────────────────────────────────────────────────

async function filterArticlesByDate(articles, limitHours = 48) {
    const now = Date.now();
    const limitMs = limitHours * 60 * 60 * 1000;
    const filtered = [];

    for (const article of articles.slice(0, 30)) { // cap để tránh quá nhiều requests
        const date = await extractArticleDate(article.url);
        if (date && now - date <= limitMs) {
            filtered.push({ ...article, date: new Date(date).toISOString() });
        }
    }
    return filtered;
}

// ─── MAIN UPDATE ─────────────────────────────────────────────────────────────

async function updateTrendingData() {
    console.log('🔄 Bắt đầu cập nhật trending data...');
    try {
        // 1. Scrape listing pages song song
        const [kenh14Articles, saostarArticles] = await Promise.all([
            scrapeKenh14Headlines(),
            scrapeSaostarHeadlines(),
        ]);

        const allArticles = [...kenh14Articles, ...saostarArticles];
        console.log(`📊 Tổng số bài: ${allArticles.length}`);

        // 2. Dùng Gemini extract tên từ tiêu đề (KHÔNG tự rank)
        const titles = allArticles.map(a => a.title);
        const nameMap = await extractNamesFromTitles(titles);
        console.log(`🏷️ Extracted names for ${Object.keys(nameMap).length} titles`);

        // 3. Tính frequency score → rank
        const ranked = buildCelebRanking(allArticles, nameMap);
        console.log('📈 Top ranked:', ranked.slice(0, 7).map(r => `${r.name}(${r.score})`).join(', '));

        // 4. Lấy top 7, filter articles theo 48h
        const top7 = ranked.slice(0, 7);
        const people = [];

        for (const celeb of top7) {
            // Filter articles của người này theo 48h
            const filtered = await filterArticlesByDate(celeb.rawArticles);
            const stats = await getPeopleStats([celeb.name]);

            people.push({
                name: celeb.name,
                score: celeb.score,
                articleCount: celeb.articleCount,
                dramaScore: celeb.dramaScore,
                stats: stats[0]?.stats || {},
                articles: filtered.slice(0, 10),
            });
        }

        trendingCache = {
            people,
            updatedAt: new Date().toISOString(),
        };

        console.log('✅ Trending data cập nhật thành công!');
    } catch (err) {
        console.error('❌ Lỗi cập nhật trending:', err.message);
    }
}

function getTrendingCache() {
    return trendingCache;
}

module.exports = {
    updateTrendingData,
    getTrendingCache,
    scrapeKenh14Headlines,
    scrapeSaostarHeadlines,
};
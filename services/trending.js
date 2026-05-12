const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { safeFetch, extractArticleDate } = require('./scraper');
const { generateSummaryWithRetry } = require('./gemini');
const { getPeopleStats } = require('./stats');

// In-memory cache
let trendingCache = {
    people: [],
    updatedAt: null
};

// Fetch HTML with Puppeteer - scrolls through page and clicks load more to get all articles
async function fetchWithPuppeteer(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Scroll and click load more button multiple times to load all content
        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrolls = 15; // Prevent infinite loops - tăng số lần scroll
        
        while (scrollAttempts < maxScrolls) {
            // Get current page height
            const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            
            // If height hasn't changed, we've reached the end
            if (currentHeight === previousHeight) {
                console.log(`✅ Reached end of page after ${scrollAttempts} scrolls`);
                break;
            }
            
            previousHeight = currentHeight;
            scrollAttempts++;
            
            // Scroll to bottom of page
            await page.evaluate(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
            
            console.log(`📜 Scrolled down (attempt ${scrollAttempts}), page height: ${currentHeight}px`);
            
            // Waiting 4 seconds between scrolls for lazy loading
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // Try to click load more button if it exists
            try {
                const clicked = await page.evaluate(() => {
                    const btn = document.querySelector('a[onclick*="LoadListDetail"]') || 
                               document.querySelector('a[onclick*="LoadList"]') ||
                               document.querySelector('a[onclick*="Load"]');
                    if (btn && btn.offsetParent !== null) { // Check if visible
                        btn.click();
                        return true;
                    }
                    return false;
                });
                
                if (clicked) {
                    console.log(`✅ Clicked load more button (attempt ${scrollAttempts})`);
                    // Waiting 4 seconds for content to load after each click
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
            } catch (err) {
                // Load more button might not exist, continue scrolling
            }
        }
        
        console.log(`📰 Finished loading content after ${scrollAttempts} scrolls`);
        
        // Wait a final moment for all images and content to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the full HTML content
        const html = await page.content();
        await browser.close();
        
        return html;
    } catch (err) {
        if (browser) await browser.close();
        console.warn(`⚠️  fetchWithPuppeteer failed for ${url}: ${err.message}`);
        // Fallback to safeFetch if Puppeteer fails
        return await safeFetch(url);
    }
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

// Parse articles từ HTML cho nhiều người - Chỉ parse HTML 1 lần
async function parseArticlesFromHTML(html, sourceUrl, sourceName, people) {
    if (!html) return {};
    
    // Xuất HTML ra file để xem toàn bộ nội dung
    fs.writeFileSync('html_output.html', html, 'utf8');
    console.log('✅ HTML từ ' + sourceName + ' đã được lưu vào file: html_output.html');
    
    const $ = cheerio.load(html);
    const now = Date.now();
    const limit48h = 48 * 60 * 60 * 1000;
    const peopleArticles = {};

    // Initialize articles array cho mỗi person
    people.forEach(p => {
        if (p) peopleArticles[p] = [];
    });

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

        // Kiểm tra có đề cập đến người nào trong list không
        const titleLower = title.toLowerCase();
        const matchedPeople = people.filter(p => {
            if (!p) return false;
            const nameLower = p.toLowerCase();
            if (titleLower.includes(nameLower)) {
                return true;
            }
            const nameParts = nameLower.split(' ').filter(part => part.length > 0);
            if (nameParts.length > 1) {
                return nameParts.every(part => titleLower.includes(part));
            }
            return false;
        });

        // Nếu title match với bất kỳ người nào, thêm vào tất cả matched people
        if (matchedPeople.length > 0) {
            matchedPeople.forEach(person => {
                peopleArticles[person].push({ title, url: fullUrl, source: sourceName });
            });
        }
    });

    // Filter by 48-hour window và limit
    for (const person of people) {
        if (!person || !peopleArticles[person]) continue;

        const filtered = [];
        for (const article of peopleArticles[person]) {
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
        peopleArticles[person] = filtered.slice(0, 20);
    }

    return peopleArticles;
}

// Lấy ALL bài báo cho mỗi người trong 48 giờ - Chỉ fetch HTML 1 lần per source
async function fetchArticlesForPeople(people) {
    const sources = [
        { url: 'https://kenh14.vn/star.chn', name: 'Kenh14', usePuppeteer: true },
        { url: 'https://www.saostar.vn/giai-tri/', name: 'Saostar', usePuppeteer: false }
    ];

    const peopleArticles = {};
    people.forEach(p => {
        if (p) peopleArticles[p] = [];
    });

    // Fetch từ mỗi source CHỈ 1 LẦN
    for (const src of sources) {
        console.log(`📲 Đang fetch từ ${src.name}...`);
        let html;
        
        if (src.usePuppeteer) {
            html = await fetchWithPuppeteer(src.url);
        } else {
            html = await safeFetch(src.url);
        }

        // Parse HTML cho TẤT CẢ người cùng lúc
        const articlesForAllPeople = await parseArticlesFromHTML(html, src.url, src.name, people);
        
        // Merge vào peopleArticles
        for (const person of people) {
            if (person && articlesForAllPeople[person]) {
                peopleArticles[person].push(...articlesForAllPeople[person]);
            }
        }
    }

    // Sort theo ngày và limit top 10 cho mỗi person
    const result = [];
    for (const person of people) {
        if (!person) continue;

        peopleArticles[person].sort((a, b) => new Date(b.date) - new Date(a.date));
        const topArticles = peopleArticles[person].slice(0, 10);

        result.push({
            person,
            articles: topArticles
        });

        console.log(`📄 ${person}: tìm được ${topArticles.length} bài báo`);
    }

    return result;
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

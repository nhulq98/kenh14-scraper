const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const http = require('http');
const https = require('https');

// ─── Fix #2: Reuse TCP connections via keep-alive agents ───────────────────
const httpAgent  = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

const AXIOS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
};

const axiosInstance = axios.create({
    headers: AXIOS_HEADERS,
    timeout: 10000,       // 10s — fail fast thay vì 30s
    maxRedirects: 3,      // giảm từ 5
    decompress: true,
    httpAgent,
    httpsAgent,
});

// ─── Fix #5: In-memory LRU-style cache ─────────────────────────────────────
const CACHE_MAX  = 100;                 // tối đa 100 URL
const CACHE_TTL  = 30 * 60 * 1000;     // 30 phút

const articleCache = new Map();         // url → { data, expiredAt }

function getCached(url) {
    const entry = articleCache.get(url);
    if (!entry) return null;
    if (Date.now() > entry.expiredAt) {
        articleCache.delete(url);
        return null;
    }
    return entry.data;
}

function setCache(url, data) {
    // Evict oldest entry khi đầy
    if (articleCache.size >= CACHE_MAX) {
        const firstKey = articleCache.keys().next().value;
        articleCache.delete(firstKey);
    }
    articleCache.set(url, { data, expiredAt: Date.now() + CACHE_TTL });
}

// ─── Fix #3: Single-pass DOM extraction ────────────────────────────────────
const SELECTORS = {
    'saostar.vn': ['article', '.fck_detail', '.article-content'],
    'kenh14.vn':  ['.fck_detail', '.article-content', 'article', '[itemtype*="Article"]', 'div[class*="content"]'],
    default:       ['.fck_detail', '.article-content', 'article', '[itemtype*="Article"]', 'div[class*="content"]'],
};

const MIN_CONTENT_LENGTH = 100; // bỏ qua nav/footer ngắn

function extractContent($, url) {
    const host = Object.keys(SELECTORS).find(k => url.includes(k)) || 'default';
    const selectors = SELECTORS[host];

    for (const sel of selectors) {
        const el = $(sel).first();
        if (!el.length) continue;

        // Thử lấy các <p> trước
        const paras = el.find('p')
            .map((_, p) => $(p).text().trim())
            .get()
            .filter(Boolean);

        if (paras.length > 0) return paras.join('\n\n');

        // Fallback: raw text của element
        const text = el.text().trim();
        if (text.length >= MIN_CONTENT_LENGTH) return text;
    }
    return '';
}

// ───────────────────────────────────────────────────────────────────────────

class ScraperService {
    /**
     * Safe fetch — trả về '' nếu lỗi thay vì throw
     */
    static async safeFetch(url, options = {}) {
        try {
            const res = await axiosInstance.get(url, options);
            return res.data;
        } catch (err) {
            console.warn(`⚠️  safeFetch failed for ${url}: ${err.message}`);
            return '';
        }
    }

    /**
     * Scrape bài viết từ URL
     * Fix #2: dùng axiosInstance (keep-alive)
     * Fix #3: single-pass DOM extraction
     * Fix #5: cache kết quả 30 phút
     */
    static async scrapeArticle(url) {
        // Fix #5: trả về cache nếu còn hạn
        const cached = getCached(url);
        if (cached) {
            console.log(`📦 Cache hit: ${url}`);
            return cached;
        }

        const response = await axiosInstance.get(url);   // Fix #2
        const $ = cheerio.load(response.data);

        // Extract title — giữ nguyên logic cũ, ưu tiên theo thứ tự
        const title =
            $('h1.fck_title').text().trim() ||
            $('article h1').first().text().trim() ||
            $('h1').first().text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            '';

        // Fix #3: single-pass extraction
        const content = extractContent($, url);

        const fullContent = (title ? title + '\n' + content : content)
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!fullContent) return null;

        const result = {
            title,
            content: fullContent,
            charCount: fullContent.length,
            wordCount: fullContent.split(/\s+/).filter(Boolean).length,
        };

        // Fix #5: lưu cache
        setCache(url, result);

        return result;
    }

    /**
     * Fetch page with Puppeteer to handle lazy loading and dynamic content
     * Tự động scroll đến cuối trang để trigger lazy load - aggressive scrolling
     */
    static async fetchWithLazyLoad(url, options = {}) {
        const {
            scrollDelay = 5000,
            scrollPause = 4000,
            maxScrolls = 20,
            headless = true,
            clickLoadMore = false,
            callLoadListDetail = false,
            scrollToBottom = false,
            additionalScrolls = 0
        } = options;

        let browser = null;
        let page = null;

        // Helper để sleep - thay thế page.waitForTimeout
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        try {
            browser = await puppeteer.launch({
                headless: headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions'
                ],
                executablePath: '/usr/bin/google-chrome'
            });

            page = await browser.newPage();
            await page.setDefaultNavigationTimeout(15000);
            await page.setDefaultTimeout(15000);
            await page.setViewport({ width: 1280, height: 2048 }); // Tăng height để thấy nhiều content hơn

            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Navigate
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (navErr) {
                console.warn('⚠️  Navigation warning:', navErr.message);
                await sleep(2000);
            }

            // Aggressive scroll to bottom - liên tục scroll cho đến khi không còn nội dung mới
            let previousHeight = 0;
            let scrollCount = 0;
            let noNewContentCount = 0;

            console.log('🔄 Starting aggressive scrolling...');

            while (scrollCount < maxScrolls) {
                try {
                    // Scroll down
                    await page.evaluate(() => {
                        window.scrollBy(0, window.innerHeight * 1.5); // Scroll nhiều hơn
                    });

                    await sleep(scrollPause);

                    // Check current height
                    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

                    if (currentHeight === previousHeight) {
                        noNewContentCount++;
                        console.log(`📄 No new content detected (${noNewContentCount}x)`);
                        
                        if (noNewContentCount >= 3) {
                            console.log('✅ Reached bottom - no more content');
                            break;
                        }
                    } else {
                        noNewContentCount = 0;
                        console.log(`📈 Content loaded: ${currentHeight}px`);
                    }

                    previousHeight = currentHeight;
                    scrollCount++;
                } catch (scrollErr) {
                    console.warn('⚠️  Scroll error:', scrollErr.message);
                    break;
                }
            }

            // Click "Bấm để xem thêm" button if enabled
            if (clickLoadMore) {
                console.log('🔘 Clicking "Bấm để xem thêm" button...');
                try {
                    const button = await page.$('a[onclick*="LoadListDetail"]');
                    if (button) {
                        await button.click();
                        await sleep(4000); // Wait for content to load
                        console.log('✅ Button clicked successfully');
                    } else {
                        console.log('⚠️  LoadListDetail button not found');
                    }
                } catch (clickErr) {
                    console.warn('⚠️  Error clicking button:', clickErr.message);
                }
            }

            // Call LoadListDetail function if enabled
            if (callLoadListDetail) {
                console.log('🔄 Calling LoadListDetail() function...');
                try {
                    const result = await page.evaluate(() => {
                        if (typeof LoadListDetail === 'function') {
                            LoadListDetail();
                            return 'LoadListDetail executed';
                        }
                        return 'LoadListDetail not found';
                    });
                    console.log(`✅ ${result}`);
                    await sleep(4000); // Wait for content to load
                } catch (funcErr) {
                    console.warn('⚠️  Error calling LoadListDetail:', funcErr.message);
                }
            }

            // Perform additional scrolls after LoadListDetail
            if (additionalScrolls > 0) {
                console.log(`🔄 Performing ${additionalScrolls} additional scrolls...`);
                previousHeight = 0;
                scrollCount = 0;
                noNewContentCount = 0;

                while (scrollCount < additionalScrolls) {
                    try {
                        await page.evaluate(() => {
                            window.scrollBy(0, window.innerHeight * 0.8);
                        });

                        await sleep(scrollPause);

                        const currentHeight = await page.evaluate(() => document.body.scrollHeight);

                        if (currentHeight === previousHeight) {
                            noNewContentCount++;
                            if (noNewContentCount >= 2) break;
                        } else {
                            noNewContentCount = 0;
                        }

                        previousHeight = currentHeight;
                        scrollCount++;
                    } catch (scrollErr) {
                        console.warn('⚠️  Additional scroll error:', scrollErr.message);
                        break;
                    }
                }
            }

            // Final scroll to absolute bottom if enabled
            if (scrollToBottom) {
                console.log('📍 Scrolling to absolute bottom...');
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await sleep(scrollDelay);
            } else {
                // Wait thêm để render các lazy-loaded elements cuối cùng
                await sleep(scrollDelay);
            }

            // Get final HTML
            const html = await page.content();
            return html;
        } catch (err) {
            console.warn(`⚠️  fetchWithLazyLoad failed for ${url}: ${err.message}`);
            return '';
        } finally {
            try {
                if (page) await page.close();
            } catch (e) { }
            if (browser) {
                try {
                    await browser.close();
                } catch (e) { }
            }
        }
    }

    /**
     * Extract publish date từ article page
     * Dùng axiosInstance (keep-alive) + cache chung để tránh fetch lại URL đã scrape
     */
    static async extractArticleDate(articleUrl) {
        try {
            // Tái dụng cache nếu đã scrape URL này rồi — tránh double fetch
            const html = getCached('__html__' + articleUrl) || await (async () => {
                const raw = await axiosInstance.get(articleUrl).then(r => r.data).catch(() => '');
                if (raw) setCache('__html__' + articleUrl, raw);
                return raw;
            })();

            if (!html) return null;

            const $ = cheerio.load(html);

            const dateStr =
                $('span.kbwcm-time').attr('title') ||
                $('meta[property="article:published_time"]').attr('content') ||
                $('meta[name="publish_date"]').attr('content') ||
                $('meta[property="og:published_time"]').attr('content') ||
                $('time').attr('datetime') ||
                $('[class*="published"], [class*="date"], [class*="time"]').first().attr('datetime') ||
                '';

            if (dateStr) {
                const publishDate = new Date(dateStr);
                if (!isNaN(publishDate.getTime())) return publishDate.getTime();
            }

            // Fallback: parse từ text
            const timeText =
                $('time').first().text() ||
                $('[class*="published"]').first().text() ||
                $('[class*="date"]').first().text() ||
                $('span.kbwcm-time').first().text() || '';

            if (timeText.includes('vừa xong') || timeText.includes('Vừa xong')) return Date.now();
            if (timeText.includes('1 phút')   || timeText.includes('vài phút'))  return Date.now() - 5  * 60 * 1000;
            if (timeText.includes('1 giờ')    || timeText.includes('vài giờ'))   return Date.now() - 30 * 60 * 1000;
            if (timeText.includes('1 ngày')   || timeText.includes('hôm qua'))   return Date.now() - 24 * 60 * 60 * 1000;

            return null;
        } catch (err) {
            console.warn(`⚠️  extractArticleDate failed for ${articleUrl}:`, err.message);
            return null;
        }
    }
}

module.exports = ScraperService;
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugScroll() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('🌐 Đang mở trang Kenh14 star...');
        await page.goto('https://kenh14.vn/star.chn', { waitUntil: 'networkidle2', timeout: 30000 });
        
        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrolls = 15;
        const scrollHeights = [];
        
        while (scrollAttempts < maxScrolls) {
            const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            
            console.log(`\n📊 Scroll lần ${scrollAttempts + 1}:`);
            console.log(`   - Chiều cao trang hiện tại: ${currentHeight}px`);
            scrollHeights.push(currentHeight);
            
            if (currentHeight === previousHeight) {
                console.log(`✅ Trang không còn tăng kích thước - Đã đạt cuối trang`);
                break;
            }
            
            previousHeight = currentHeight;
            scrollAttempts++;
            
            // Scroll to bottom
            console.log(`   - Đang scroll xuống...`);
            await page.evaluate(() => {
                window.scrollTo(0, document.documentElement.scrollHeight);
            });
            
            // Wait for lazy loading
            console.log(`   - Chờ 4 giây để load content...`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            // Try to click load more button
            try {
                const clicked = await page.evaluate(() => {
                    const btn = document.querySelector('a[onclick*="LoadListDetail"]') || 
                               document.querySelector('a[onclick*="LoadList"]') ||
                               document.querySelector('a[onclick*="Load"]');
                    if (btn && btn.offsetParent !== null) {
                        console.log('   ✅ Tìm thấy nút Load More!');
                        btn.click();
                        return true;
                    }
                    return false;
                });
                
                if (clicked) {
                    console.log(`   - Đã click nút Load More, chờ 4 giây...`);
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
            } catch (err) {
                console.log(`   - Không tìm thấy nút Load More hoặc lỗi: ${err.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📈 Tóm tắt Scroll:');
        console.log(`   - Tổng số lần scroll: ${scrollAttempts}`);
        console.log(`   - Chiều cao trang cuối cùng: ${previousHeight}px`);
        console.log(`   - Lịch sử chiều cao:`, scrollHeights);
        
        // Get HTML
        const html = await page.content();
        fs.writeFileSync('debug-html-output.html', html, 'utf8');
        console.log(`✅ HTML đã lưu vào debug-html-output.html`);
        
        // Parse and count
        const $ = cheerio.load(html);
        const totalLinks = $('a').length;
        console.log(`\n📊 Phân tích HTML:`);
        console.log(`   - Tổng số link: ${totalLinks}`);
        
        // Count articles with reasonable titles
        let validArticles = 0;
        const articles = [];
        $('a').each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            
            if (title && title.length > 10 && href && href !== '#') {
                validArticles++;
                articles.push({ title: title.substring(0, 50), href });
            }
        });
        
        console.log(`   - Bài viết có tiêu đề hợp lệ: ${validArticles}`);
        console.log(`\n📰 Top 20 bài viết tìm được:`);
        articles.slice(0, 20).forEach((art, i) => {
            console.log(`   ${i+1}. ${art.title}... -> ${art.href.substring(0, 50)}`);
        });
        
        await browser.close();
        
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        if (browser) await browser.close();
    }
}

debugScroll();

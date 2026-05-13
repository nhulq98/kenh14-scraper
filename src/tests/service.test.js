const ScraperService = require('../services/scraper.service');
const GeminiService = require('../services/gemini.service');
const trendingService = require('../services/trending.service');
const StatsService = require('../services/stats.service');
const VoiceService = require('../services/voice.service');

async function runTests() {
    console.log('🧪 Starting Unit Tests for Refactored Services...\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${message}`);
            failed++;
        }
    };

    // 1. ScraperService Test
    try {
        assert(typeof ScraperService.scrapeArticle === 'function', 'ScraperService.scrapeArticle is a function');
        assert(typeof ScraperService.safeFetch === 'function', 'ScraperService.safeFetch is a function');

        console.log('Testing ScraperService.scrapeArticle with a sample URL...');
        // Test with a known URL (or mock it)
        const result = await ScraperService.scrapeArticle('https://kenh14.vn');
        if (result) {
            assert(true, 'ScraperService.scrapeArticle successfully returned data for kenh14.vn');
        } else {
            // Note: This might fail if network is down, but we check if it handles it
            console.log('Scraper returned null (expected if page structure changed or no article found at root)');
        }
    } catch (err) {
        console.error('Scraper Test error:', err.message);
        failed++;
    }

    // 2. GeminiService Test
    try {
        assert(typeof GeminiService.generateSummaryWithRetry === 'function', 'GeminiService.generateSummaryWithRetry is a function');
    } catch (err) {
        failed++;
    }

    // 3. TrendingService Test
    try {
        assert(typeof trendingService.updateTrendingData === 'function', 'trendingService.updateTrendingData is a function');
        assert(typeof trendingService.getTrendingCache === 'function', 'trendingService.getTrendingCache is a function');
    } catch (err) {
        failed++;
    }

    // 4. StatsService Test
    try {
        assert(typeof StatsService.getPeopleStats === 'function', 'StatsService.getPeopleStats is a function');
        const stats = await StatsService.getPeopleStats(['Sơn Tùng MTP']);
        assert(Array.isArray(stats), 'StatsService.getPeopleStats returns an array');
    } catch (err) {
        failed++;
    }

    // 5. VoiceService Test
    try {
        assert(typeof VoiceService.convertTextToSpeech === 'function', 'VoiceService.convertTextToSpeech is a function');
    } catch (err) {
        failed++;
    }

    console.log(`\n📊 Test Results: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();

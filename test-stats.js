#!/usr/bin/env node
/**
 * Test script to verify stats configuration
 * Run: node test-stats.js
 */

const dotenv = require('dotenv');
dotenv.config();

const stats = require('./services/stats.js');

// Colors for console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(`${colors[color]}`, ...args, colors.reset);
}

async function testStats() {
    log('blue', '\n=== Testing Stats Configuration ===\n');

    // Test 1: Check environment
    log('cyan', '1️⃣  Checking Environment Variables...');
    const fbToken = process.env.FB_ACCESS_TOKEN;
    const googleKey = process.env.GOOGLE_API_KEY;
    
    if (fbToken) {
        log('green', '   ✅ FB_ACCESS_TOKEN configured');
    } else {
        log('yellow', '   ⚠️  FB_ACCESS_TOKEN not set (Facebook stats will be mock)');
    }
    
    if (googleKey) {
        log('green', '   ✅ GOOGLE_API_KEY configured');
    } else {
        log('yellow', '   ⚠️  GOOGLE_API_KEY not set (optional)');
    }

    // Test 2: Test Facebook Stats
    log('cyan', '\n2️⃣  Testing Facebook Stats...');
    try {
        const fbStats = await stats.getFacebookStats('Dua Lipa');
        log('green', `   ✅ Facebook stats:`, JSON.stringify(fbStats, null, 2));
    } catch (err) {
        log('red', `   ❌ Facebook error:`, err.message);
    }

    // Test 3: Test Person Stats (Facebook only)
    log('cyan', '\n3️⃣  Testing Full Person Stats...');
    try {
        const personStats = await stats.getPersonStats('Ngô Thanh Vân');
        log('green', `   ✅ Person stats retrieved:`, JSON.stringify(personStats, null, 2));
    } catch (err) {
        log('red', `   ❌ Person stats error:`, err.message);
    }

    // Test 4: Test Batch Stats
    log('cyan', '\n4️⃣  Testing Batch Stats (Multiple People)...');
    try {
        const people = ['Ngô Thanh Vân', 'Phương Oanh', 'Vĩnh Đạm'];
        const batchStats = await stats.getPeopleStats(people);
        log('green', `   ✅ Batch stats for ${batchStats.length} people retrieved`);
        batchStats.forEach(item => {
            log('green', `      - ${item.person}:`, JSON.stringify(item.stats, null, 2));
        });
    } catch (err) {
        log('red', `   ❌ Batch stats error:`, err.message);
    }

    // Summary
    log('blue', '\n=== Summary ===');
    log('cyan', 'Status: All tests completed');
    log('yellow', 'Note: Now collecting Facebook stats only');
    log('yellow', 'Configure FB_ACCESS_TOKEN in .env for real data\n');
}

// Run tests
testStats().catch(err => {
    log('red', 'Fatal error:', err);
    process.exit(1);
});

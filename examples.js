/**
 * Example Usage of Stats Service
 * 
 * This file demonstrates how to use the stats service
 * to fetch trending data with social media metrics.
 */

const stats = require('./services/stats');

// Example 1: Get stats for a single person
async function example1() {
    console.log('\n📊 Example 1: Single Person Stats\n');
    
    const personStats = await stats.getPersonStats('Taylor Swift');
    
    console.log('Taylor Swift Stats:');
    console.log('Facebook Views:', personStats.facebook.views.toLocaleString());
    console.log('Facebook Likes:', personStats.facebook.likes.toLocaleString());
    console.log('Facebook Comments:', personStats.facebook.comments.toLocaleString());
}

// Example 2: Get stats for multiple people
async function example2() {
    console.log('\n📊 Example 2: Multiple People Stats\n');
    
    const people = ['Ngô Thanh Vân', 'Phương Oanh', 'Vĩnh Đạm'];
    const results = await stats.getPeopleStats(people);
    
    results.forEach(item => {
        console.log(`\n${item.person}:`);
        console.log(`  Views: ${(item.stats.facebook.views / 1000000).toFixed(1)}M`);
        console.log(`  Likes: ${(item.stats.facebook.likes / 1000).toFixed(1)}K`);
        console.log(`  Comments: ${(item.stats.facebook.comments / 1000).toFixed(1)}K`);
    });
}

// Example 3: Facebook stats
async function example3() {
    console.log('\n📊 Example 3: Facebook Stats\n');
    
    const personName = 'BTS';
    
    const facebookStats = await stats.getFacebookStats(personName);
    
    console.log(`${personName} Facebook Stats:`);
    console.log('  Views:', facebookStats.views.toLocaleString());
    console.log('  Likes:', facebookStats.likes.toLocaleString());
    console.log('  Comments:', facebookStats.comments.toLocaleString());
}

// Example 4: Caching demonstration
async function example4() {
    console.log('\n📊 Example 4: Caching Demonstration\n');
    
    const personName = 'Dua Lipa';
    
    console.log('First call (fresh fetch):');
    const start1 = Date.now();
    const stats1 = await stats.getPersonStats(personName);
    const time1 = Date.now() - start1;
    console.log(`  Time: ${time1}ms`);
    
    console.log('\nSecond call (from cache):');
    const start2 = Date.now();
    const stats2 = await stats.getPersonStats(personName);
    const time2 = Date.now() - start2;
    console.log(`  Time: ${time2}ms (much faster!)`);
    
    console.log(`\n✅ Cache speed improvement: ${(time1 / time2).toFixed(1)}x faster`);
}

// Example 5: Formatted output for UI
async function example5() {
    console.log('\n📊 Example 5: Formatted Output for UI\n');
    
    const people = ['Phương Oanh', 'Ngô Thanh Vân'];
    const results = await stats.getPeopleStats(people);
    
    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    results.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.person}`);
        console.log('📘 Facebook');
        console.log(`   Views: ${formatNumber(item.stats.facebook.views)}`);
        console.log(`   Likes: ${formatNumber(item.stats.facebook.likes)}`);
        console.log(`   Comments: ${formatNumber(item.stats.facebook.comments)}`);
    });
}

// Run all examples
async function runAll() {
    try {
        await example1();
        await example2();
        await example3();
        await example4();
        await example5();
        
        console.log('\n✅ All examples completed successfully!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error running examples:', err);
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    example1,
    example2,
    example3,
    example4,
    example5,
    runAll
};

// Run if called directly
if (require.main === module) {
    runAll();
}

// Stats fetcher service - Lấy số liệu từ các platform
const axios = require('axios');

// Cache for stats (30 minute TTL)
const statsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

class StatsService {
    static getCachedStats(personName) {
        const cached = statsCache.get(personName);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    static setCachedStats(personName, stats) {
        statsCache.set(personName, {
            data: stats,
            timestamp: Date.now()
        });
    }

    // Get all stats for a person
    static async getPersonStats(personName) {
        // Check cache first
        const cached = this.getCachedStats(personName);
        if (cached) {
            console.log(`📦 Using cached stats for "${personName}"`);
            return cached;
        }

        try {
            console.log(`🔄 Fetching fresh stats for "${personName}"...`);

            const stats = {};

            // Cache the results
            this.setCachedStats(personName, stats);

            return stats;
        } catch (err) {
            console.warn(`❌ Failed to fetch stats for "${personName}":`, err.message);
            return {};
        }
    }

    // Batch fetch stats for multiple people
    static async getPeopleStats(people) {
        try {
            const statsPromises = people
                .filter(p => p)
                .map(person => this.getPersonStats(person).then(stats => ({ person, stats })));

            const results = await Promise.all(statsPromises);
            console.log(`✅ Fetched stats for ${results.length} people`);
            return results;
        } catch (err) {
            console.error('❌ Error fetching people stats:', err);
            return [];
        }
    }
}

module.exports = StatsService;

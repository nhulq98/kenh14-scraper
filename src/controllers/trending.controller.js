const trendingService = require('../services/trending.service');

class TrendingController {
    /**
     * Get trending data (people + hot articles)
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleGetTrending(req, res) {
        try {
            // Nếu cache trống thì fetch ngay
            const cache = await trendingService.getTrendingCache();
            if (!cache.updatedAt) {
                await trendingService.updateTrendingData();
            }

            const finalCache = await trendingService.getTrendingCache();
            
            res.json({
                success: true,
                people: finalCache.people,
                hotArticles: finalCache.hotArticles || [],
                updatedAt: finalCache.updatedAt
            });
        } catch (error) {
            console.error('Trending get error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy dữ liệu trending'
            });
        }
    }

    /**
     * Refresh trending data
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleRefreshTrending(req, res) {
        try {
            await trendingService.updateTrendingData();
            const cache = await trendingService.getTrendingCache();
            
            res.json({
                success: true,
                people: cache.people,
                hotArticles: cache.hotArticles || [],
                updatedAt: cache.updatedAt
            });
        } catch (error) {
            console.error('Trending refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi làm mới dữ liệu trending'
            });
        }
    }

}

module.exports = TrendingController;

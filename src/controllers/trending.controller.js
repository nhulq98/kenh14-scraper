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
            
            // Get hot articles (from cache if available)
            const hotArticlesData = await trendingService.getHotArticles();
            
            res.json({
                success: true,
                people: finalCache.people,
                articles: hotArticlesData.articles,
                updatedAt: finalCache.updatedAt,
                articlesUpdatedAt: hotArticlesData.updatedAt
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
            
            // Get hot articles with refresh=true to bypass cache
            const hotArticlesData = await trendingService.getHotArticles(true);
            
            res.json({
                success: true,
                people: cache.people,
                articles: hotArticlesData.articles,
                updatedAt: cache.updatedAt,
                articlesUpdatedAt: hotArticlesData.updatedAt
            });
        } catch (error) {
            console.error('Trending refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi làm mới dữ liệu trending'
            });
        }
    }

    /**
     * Get hot articles
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleGetHotArticles(req, res) {
        try {
            const hotArticlesData = await trendingService.getHotArticles();
            res.json({
                success: true,
                ...hotArticlesData
            });
        } catch (error) {
            console.error('Hot articles get error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách bài báo hot'
            });
        }
    }
}

module.exports = TrendingController;

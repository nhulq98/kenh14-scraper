const scraperService = require('../services/scraper.service');
const { getErrorMessage } = require('../../utils/helpers');

class ScraperController {
    /**
     * Handle scrape request
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleScrape(req, res) {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'URL là bắt buộc'
                });
            }

            if (!(url.includes('kenh14.vn') || url.includes('saostar.vn'))) {
                return res.status(400).json({
                    success: false,
                    error: 'URL phải từ kenh14.vn hoặc saostar.vn'
                });
            }

            console.log(`Scraping: ${url}`);

            const result = await scraperService.scrapeArticle(url);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    error: 'Không tìm thấy nội dung bài viết'
                });
            }

            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            const errorMessage = getErrorMessage(error);
            console.error('Scrape error:', errorMessage);

            let errorMsg = 'Lỗi khi lấy dữ liệu';
            if (error.code === 'ENOTFOUND') {
                errorMsg = 'URL không hợp lệ hoặc không thể truy cập';
            } else if (error.code === 'ECONNREFUSED') {
                errorMsg = 'Không thể kết nối đến trang web';
            } else if (errorMessage.toLowerCase().includes('timeout')) {
                errorMsg = 'Kết nối quá chậm (timeout 30s). Vui lòng kiểm tra kết nối internet hoặc thử lại sau.';
            }

            res.status(500).json({
                success: false,
                error: errorMsg
            });
        }
    }
}

module.exports = ScraperController;

const geminiService = require('../services/gemini.service');
const { getErrorMessage, isRateLimitOrHighDemandError } = require('../../utils/helpers');

class GeminiController {
    /**
     * Handle summarize request
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleSummarize(req, res) {
        try {
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    error: 'Nội dung là bắt buộc'
                });
            }

            console.log(`Summarizing with Gemini...`);

            // Tạo prompt theo yêu cầu
            const prompt = `Role: Bạn là một Biên tập viên tin tức dày dặn kinh nghiệm, chuyên sáng tạo nội dung "tin nhanh" xu hướng trên mạng xã hội. Phong cách viết: Sắc sảo, gãy gọn, giàu thông tin và đúng văn phong báo chí hiện đại.
                Task: Tóm tắt bài báo được cung cấp bên dưới thành đúng 3 đoạn nội dung (Mở - Thân - Kết).
                YÊU CẦU KỸ THUẬT BẮT BUỘC:
                1. Định dạng cấu trúc: 
                - Chỉ xuất ra đúng 3 đoạn văn. KHÔNG thêm tiêu đề "Mở/Thân/Kết", KHÔNG thêm lời mở đầu hay lời kết của AI (ví dụ: Không ghi "Đây là tóm tắt của bạn...").
                - MỘT ĐOẠN PHẢI CÓ ĐÚNG 3 CÂU (ngắt bằng dấu chấm). Không viết 1 câu, không viết 2 câu, bắt buộc phải là 3 câu/đoạn. Mỗi câu trung bình từ 15-20 từ.

                2. Văn phong & Biên tập:
                - Sử dụng ngôn ngữ báo chí hiện đại, giật tít ngầm, loại bỏ hoàn toàn từ thừa. Tập trung làm nổi bật thông điệp chính của tiêu đề.

                3. Bộ lọc kiểm duyệt (Tránh vi phạm chính sách TikTok):
                - Tự động quét và thay thế tất cả các từ nhạy cảm bằng từ đồng nghĩa hoặc nói giảm nói tránh. Ví dụ: "giết/sát hại" -> "tiễn/lấy đi mạng sống", "lừa đảo/chiếm đoạt" -> "chiêu trò gian lận/vây bẫy tài chính", "máu" -> "vết đỏ", "bắt giam/tội phạm" -> "vướng vòng lao lý/đối tượng".

                CẤU TRÚC CHI TIẾT TỪNG ĐOẠN:
                - Đoạn 1 (3 câu): Trực diện, nêu bật sự kiện nóng nhất hoặc con số gây sốc nhất ngay câu đầu tiên.
                - Đoạn 2 (3 câu): Đưa ra 2-3 chi tiết đắt giá nhất từ nội dung bài báo để làm rõ bản chất vấn đề.
                - Đoạn 3 (3 câu): Đưa ra góc nhìn tổng kết, lời cảnh báo hoặc dự báo diễn biến tiếp theo để tạo sự trọn vẹn (không kết cụt).

                NỘI DUNG BÀI BÁO CẦN TÓM TẮT:
                ${content}`;

            const text = await geminiService.generateSummaryWithRetry(prompt);
            console.log(text);

            res.json({
                success: true,
                summary: text
            });
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            console.error('Gemini error:', errorMessage);

            let errorMsg = 'Lỗi khi tóm tắt với Gemini';

            const isRateLimitError = isRateLimitOrHighDemandError(error);

            if (errorMessage.toLowerCase().includes('no gemini api keys configured')) {
                errorMsg = 'Chưa cấu hình API key Gemini. Vui lòng thêm GEMINI_API_KEY hoặc GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.';
            } else if (error.response && error.response.status === 400) {
                errorMsg = 'API Key không hợp lệ. Vui lòng cấu hình GEMINI_API_KEY';
            } else if (isRateLimitError) {
                errorMsg = 'Tất cả API keys đã đạt giới hạn rate limit/quota hoặc Gemini đang quá tải. Vui lòng thử lại sau 30 giây hoặc nâng cấp gói dịch vụ';
            } else if (errorMessage.toLowerCase().includes('timeout')) {
                errorMsg = 'Gemini timeout. Vui lòng thử lại';
            }

            res.status(500).json({
                success: false,
                error: errorMsg
            });
        }
    }
}

module.exports = GeminiController;

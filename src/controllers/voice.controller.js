const voiceService = require('../services/voice.service');
const { getErrorMessage } = require('../../utils/helpers');

class VoiceController {
    /**
     * Handle TTS convert request
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    static async handleVoiceConvert(req, res) {
        try {
            const { text, voice, speed } = req.body;

            // Validation
            if (!text) {
                return res.status(400).json({
                    success: false,
                    error: 'Văn bản là bắt buộc'
                });
            }

            if (text.length > 50000) {
                return res.status(400).json({
                    success: false,
                    error: 'Văn bản không được vượt quá 50000 ký tự'
                });
            }

            if (!voice) {
                return res.status(400).json({
                    success: false,
                    error: 'Vui lòng chọn giọng đọc'
                });
            }

            console.log(`🎤 TTS Request - Text: "${text.substring(0, 50)}...", Voice: ${voice}, Speed: ${speed}`);

            const audioData = await voiceService.convertTextToSpeech(text, voice, speed);

            // Set response headers for audio
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');

            // Send audio data
            res.send(audioData);

            console.log('✅ TTS conversion successful');

        } catch (error) {
            const errorMessage = getErrorMessage(error);
            console.error('TTS Error:', errorMessage);

            let errorMsg = 'Lỗi khi chuyển đổi thành âm thanh';

            if (error.message === 'VIETTEL_TTS_TOKEN_MISSING') {
                errorMsg = 'Dịch vụ TTS chưa được cấu hình. Vui lòng liên hệ admin.';
            } else if (error.message === 'API_NO_RESPONSE_DATA') {
                errorMsg = 'Không nhận được âm thanh từ API';
            } else if (errorMessage.includes('401') || errorMessage.includes('Unable to verify user')) {
                errorMsg = 'Token Viettel AI không hợp lệ. Vui lòng kiểm tra cấu hình.';
            } else if (errorMessage.includes('403')) {
                errorMsg = 'Bạn không có quyền truy cập dịch vụ TTS';
            } else if (errorMessage.includes('400')) {
                errorMsg = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại văn bản và giọng đọc.';
            } else if (errorMessage.includes('timeout')) {
                errorMsg = 'Kết nối tới Viettel AI quá chậm. Vui lòng thử lại';
            } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
                errorMsg = 'Không thể kết nối tới dịch vụ Viettel AI';
            }

            res.status(500).json({
                success: false,
                error: errorMsg
            });
        }
    }
}

module.exports = VoiceController;

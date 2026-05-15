const axios = require('axios');
const { getErrorMessage } = require('../../utils/helpers');
const https = require('https');
const agent = new https.Agent({ keepAlive: true });

class VoiceService {
    /**
     * Convert text to speech using Viettel AI
     * @param {string} text 
     * @param {string} voice 
     * @param {number} speed 
     * @returns {Promise<Buffer>}
     */
    static async convertTextToSpeech(text, voice, speed) {
        const viettelToken = process.env.VIETTEL_TTS_TOKEN;

        if (!viettelToken) {
            throw new Error('VIETTEL_TTS_TOKEN_MISSING');
        }

        const response = await axios.post('https://viettelai.vn/tts/speech_synthesis', {
            text: text.replace(/\n+/g, ' '),
            voice: voice,
            speed: speed,
            tts_return_option: 3,
            token: viettelToken,
            without_filter: false
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 30000,
            httpsAgent: agent
        });

        if (!response.data || response.data.length === 0) {
            throw new Error('API_NO_RESPONSE_DATA');
        }

        return response.data;
    }
}

module.exports = VoiceService;

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getErrorMessage, isRateLimitOrHighDemandError } = require('../utils/helpers');

// Danh sách API keys
const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2,
    process.env.GEMINI_API_KEY3
].filter(key => key);

if (apiKeys.length === 0) {
    console.warn('⚠️ Không tìm thấy bất kỳ Gemini API key nào. Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.');
}

let currentKeyIndex = 0;

// Hàm để lấy API key hiện tại
function getCurrentApiKey() {
    console.log(`🔑 Using API key ${currentKeyIndex + 1}/${apiKeys.length}`);
    return apiKeys[currentKeyIndex];
}

// Hàm để chuyển sang API key tiếp theo
function switchToNextApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`🔄 Switched to API key ${currentKeyIndex + 1}/${apiKeys.length} due to rate limit`);
}

// Hàm để thử gọi API với retry và switch key
async function generateSummaryWithRetry(prompt, maxRetries = apiKeys.length) {
    if (apiKeys.length === 0) {
        throw new Error('No Gemini API keys configured. Please set GEMINI_API_KEY or GEMINI_API_KEY1/GEMINI_API_KEY2/GEMINI_API_KEY3.');
    }

    let attempts = 0;
    let lastError = null;

    console.log(`🚀 Starting Gemini API call with ${apiKeys.length} available keys (max retries: ${maxRetries})`);

    while (attempts < maxRetries) {
        try {
            // Cập nhật model với API key hiện tại
            const currentGenAI = new GoogleGenerativeAI(getCurrentApiKey());
            const currentModel = currentGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const result = await currentModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log(`✅ Successfully generated summary using API key ${currentKeyIndex + 1}`);
            return text;
        } catch (error) {
            lastError = error;
            const errorMessage = getErrorMessage(error);
            console.error(`❌ Attempt ${attempts + 1}/${maxRetries} failed with API key ${currentKeyIndex + 1}:`, errorMessage);

            // Check for rate limit/quota/high demand errors
            const isRateLimitError = isRateLimitOrHighDemandError(error);

            if (isRateLimitError) {
                // Rate limit/quota hit or high demand service error, switch to next key
                switchToNextApiKey();
                attempts++;
                console.log(`⏳ Retrying with next API key... (${attempts}/${maxRetries})`);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                // Other error, don't retry
                console.error(`💥 Non-retryable error encountered, stopping attempts`);
                throw error;
            }
        }
    }

    // If all retries failed
    console.error(`🚫 All ${maxRetries} attempts failed. Last error:`, getErrorMessage(lastError));
    throw lastError || new Error('Unknown Gemini error');
}

module.exports = {
    generateSummaryWithRetry,
    getCurrentApiKey,
    switchToNextApiKey
};

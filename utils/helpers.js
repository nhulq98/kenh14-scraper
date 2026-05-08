// Utility functions

function getErrorMessage(error) {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.response && error.response.data) {
        try {
            return typeof error.response.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response.data);
        } catch {
            return String(error.response.data);
        }
    }
    return String(error);
}

function isRateLimitOrHighDemandError(error) {
    const message = (error.message || '').toLowerCase();
    const status = error.response && error.response.status;
    return (
        status === 429 ||
        status === 503 ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('too many requests') ||
        message.includes('quota exceeded') ||
        message.includes('quota') ||
        message.includes('service unavailable') ||
        message.includes('high demand')
    );
}

module.exports = {
    getErrorMessage,
    isRateLimitOrHighDemandError
};

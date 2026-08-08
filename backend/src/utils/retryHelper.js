// backend/src/utils/retryHelper.js

/**
 * Wrapper helper fungsi generik dengan exponential backoff dan jitter.
 * Otomatis melakukan retry pada HTTP Status 429 (Rate Limit) dan 5xx (Server Error).
 *
 * @param {Function} fn - Fungsi async yang akan dieksekusi.
 * @param {number} maxRetries - Batas maksimal percobaan ulang (default: 4).
 * @param {number} baseDelayMs - Delay dasar dalam ms (default: 1000ms).
 */
async function withRetry(fn, maxRetries = 4, baseDelayMs = 1000) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const statusCode = error.code || error.status || (error.response && error.response.status);
      const isRateLimit = statusCode === 429;
      const isServerError = typeof statusCode === 'number' && statusCode >= 500 && statusCode < 600;

      if ((isRateLimit || isServerError) && attempt <= maxRetries) {
        // Exponential backoff dengan jitter: baseDelay * 2^(attempt-1) + random Jitter (0-200ms)
        const delay = Math.pow(2, attempt - 1) * baseDelayMs + Math.floor(Math.random() * 200);
        console.warn(`⚠️ [Sheets Retry] Attempt ${attempt}/${maxRetries} gagal dengan status ${statusCode}. Retrying dalam ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

module.exports = { withRetry };

import { createTweet } from './library.js';

/**
 * Post a new tweet
 * @param {string} text - The tweet text content
 * @param {Object} options - Optional parameters for media, etc.
 */
async function tweet(text, options = {}) {
    try {
        console.log(`📝 Posting tweet: "${text}"`);
        const data = await createTweet(text, options);
        console.log("✅ Tweet posted successfully:", data);
        return data;
    } catch (error) {
        console.error('❌ Tweet posting failed:', error.message);
        throw error;
    }
}

// Example usage (uncomment to test):
tweet("Hello from the Twitter API! 🚀");
// tweet("Test tweet with hashtags #SRC20 #Bitcoin");

export { tweet };

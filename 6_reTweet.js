import { createRetweet, deleteRetweet } from './library.js';

/**
 * Retweet a tweet by ID
 * @param {string} tweetId - The tweet ID to retweet
 */
async function retweet(username, tweetId) {
    try {
        console.log(`🔁 Retweeting tweet: ${tweetId}`);
        const data = await createRetweet(username, tweetId);
        console.log("✅ Tweet retweeted successfully:", data);
        return data;
    } catch (error) {
        console.error('❌ Retweet failed:', error.message);
        throw error;
    }
}

/**
 * Unretweet a tweet by ID
 * @param {string} tweetId - The tweet ID to unretweet
 */
async function unretweet(tweetId) {
    try {
        console.log(`🔄 Unretweeting tweet: ${tweetId}`);
        const data = await deleteRetweet(tweetId);
        console.log("✅ Tweet unretweeted successfully:", data);
        return data;
    } catch (error) {
        console.error('❌ Unretweet failed:', error.message);
        throw error;
    }
}

// Example usage (uncomment to test):
retweet("mz42999", "1996441734780453040");
//unretweet("1995810934074261607");

export { retweet, unretweet };

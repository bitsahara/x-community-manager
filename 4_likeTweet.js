import { likeTweet, unlikeTweet } from './library.js';

/**
 * Like a tweet by ID
 * @param {string} tweetId - The tweet ID to like
 */
async function like(tweetId) {
    try {
        console.log(`❤️  Liking tweet: ${tweetId}`);
        const data = await likeTweet(tweetId);
        console.log("✅ Tweet liked successfully:", data);
        return data;
    } catch (error) {
        console.error('❌ LikeTweet failed:', error.message);
        throw error;
    }
}

/**
 * Unlike a tweet by ID
 * @param {string} tweetId - The tweet ID to unlike
 */
async function unlike(tweetId) {
    try {
        console.log(`💔 Unliking tweet: ${tweetId}`);
        const data = await unlikeTweet(tweetId);
        console.log("✅ Tweet unliked successfully:", data);
        return data;
    } catch (error) {
        console.error('❌ UnlikeTweet failed:', error.message);
        throw error;
    }
}

// Example usage (uncomment to test):
//like("1996441734780453040");
//unlike("1995810934074261607");

export { like, unlike };

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchTweets } from './library.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        // Search query - change this to search for different terms
        const query = '#SRC-20'; //or "#SRC20"

        console.log('🔍 Fetching tweets for ' + query + '...\n');

        // Use the library function to search tweets
        const tweets = await searchTweets(query, {
            count: 20,
            product: 'Latest' // Options: 'Top' or 'Latest'
        });

        console.log('✅ Found tweets:', tweets.length);
        console.log('\n📊 Tweet details:');
        console.log('─'.repeat(60));

        tweets.forEach((tweet, index) => {
            console.log(`\n${index + 1}. @${tweet.user.screenName}`);
            console.log(`   ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
            console.log(`   ❤️  ${tweet.metrics.likes} | 🔁 ${tweet.metrics.retweets} | 👁️  ${tweet.metrics.views}`);
        });

        console.log('\n' + '─'.repeat(60));
        console.log(`\n📝 Total: ${tweets.length} tweets`);

        // Load existing tweets if file exists
        const outputPath = path.join(__dirname, '3_searchTweets_result.json');
        let existingTweets = [];

        if (fs.existsSync(outputPath)) {
            try {
                const existingContent = fs.readFileSync(outputPath, 'utf-8');
                existingTweets = JSON.parse(existingContent);
                console.log(`📂 Loaded ${existingTweets.length} existing tweets from file`);
            } catch (err) {
                console.log('⚠️  Could not load existing tweets, starting fresh');
            }
        }

        // Merge tweets: update existing, add new ones
        const mergedTweets = [...tweets]; // Start with new tweets

        // For each new tweet, check if it exists in old tweets
        mergedTweets.forEach(newTweet => {
            const existingTweet = existingTweets.find(t => t.id === newTweet.id);
            if (existingTweet) {
                // Preserve the favorited field if it exists
                if (existingTweet.favorited) {
                    newTweet.favorited = existingTweet.favorited;
                }
            }
        });

        // Add old tweets that are not in the new results (to keep history)
        const newTweetIds = new Set(tweets.map(t => t.id));
        const oldTweetsToKeep = existingTweets.filter(t => !newTweetIds.has(t.id));

        // Combine: new/updated tweets first, then old tweets
        const finalTweets = [...mergedTweets, ...oldTweetsToKeep];

        // Save to file
        fs.writeFileSync(outputPath, JSON.stringify(finalTweets, null, 2));
        console.log(`💾 Saved ${finalTweets.length} tweets (${tweets.length} new/updated, ${oldTweetsToKeep.length} kept from history)`);
        console.log(`✅ Results saved to: 3_searchTweets_result.json\n`);

    } catch (error) {
        console.error('❌ Error fetching data:', error);
    }
}

main();

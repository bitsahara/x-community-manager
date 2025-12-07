import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { like } from './4_likeTweet.js'; // Use the refactored like function

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Sleep Helper (in seconds) ----------
function randomDelay(min = 3000, max = 10000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ Sleeping for ${delay / 1000} seconds before next like...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

// ---------- Load Tweets JSON ----------
function loadTweets() {
    const filePath = path.join(__dirname, '3_searchTweets_result.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

// ---------- Load Influencers List ----------
function loadInfluencers() {
    const filePath = path.join(__dirname, 'influencers.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

// ---------- Save Tweets JSON ----------
function saveTweets(tweets) {
    const filePath = path.join(__dirname, '3_searchTweets_result.json');
    fs.writeFileSync(filePath, JSON.stringify(tweets, null, 2));
}

// ---------- Like Tweets Sequentially ----------
export async function likeTweets() {
    const allTweets = loadTweets();
    const influencers = loadInfluencers();

    console.log(`\n📋 Loaded ${influencers.length} influencers from influencers.json`);
    console.log(`Influencers: ${influencers.join(', ')}\n`);

    // Filter tweets to only include those from influencers
    const influencerTweets = allTweets.filter(tweet =>
        influencers.includes(tweet.user.screenName)
    );

    // Filter out tweets that are already favorited
    const tweets = influencerTweets.filter(tweet => !tweet.favorited);

    console.log(`🔥 Found ${influencerTweets.length} tweets from influencers (out of ${allTweets.length} total tweets)`);
    console.log(`📌 ${tweets.length} tweets need to be liked (${influencerTweets.length - tweets.length} already favorited)`);
    console.log(`Will like them with a random delay of 3-10 seconds each.\n`);

    for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];

        console.log(`\n====================================`);
        console.log(`(${i + 1}/${tweets.length}) ❤️  Liking tweet ID: ${tweet.id}`);
        console.log(`User: @${tweet.user.screenName}`);
        console.log(`Text: ${tweet.text.substring(0, 120)}${tweet.text.length > 120 ? '...' : ''}\n`);

        try {

            const result = await like(tweet.id);

            // Check if like was successful
            if (result?.data?.favorite_tweet === 'Done') {
                // Mark tweet as favorited in the original allTweets array
                const tweetIndex = allTweets.findIndex(t => t.id === tweet.id);
                if (tweetIndex !== -1) {
                    allTweets[tweetIndex].favorited = true;
                    console.log(`✅ Marked tweet ${tweet.id} as favorited in JSON`);

                    // Save immediately after marking as favorited
                    saveTweets(allTweets);
                    console.log(`💾 Saved updated tweets to file`);
                }
            }
        } catch (err) {
            console.error(`❌ Failed to like tweet ${tweet.id}:`, err.message);
        }

        if (i < tweets.length - 1) {

            //await sleep(3);
            await randomDelay(3000, 10000); // Wait 3-10 seconds

        }
    }

    console.log(`\n🎉 All tweets processed!\n`);
}

// Auto-run if executed directly
likeTweets();

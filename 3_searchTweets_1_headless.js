import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCookies } from './library.js';
import Xvfb from 'xvfb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const cookies = loadCookies();

// Parse tweet data from the response
function parseTweets(data) {
    const tweets = [];

    try {
        const instructions = data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];

        for (const instruction of instructions) {
            if (instruction.type === "TimelineAddEntries") {
                const entries = instruction.entries || [];

                for (const entry of entries) {
                    if (entry.entryId?.startsWith("tweet-")) {
                        const tweetResult = entry.content?.itemContent?.tweet_results?.result;

                        if (tweetResult && tweetResult.legacy) {
                            const legacy = tweetResult.legacy;
                            const userResult = tweetResult.core?.user_results?.result;
                            const userLegacy = userResult?.legacy;
                            const userCore = userResult?.core;

                            // Parse media (photos, videos)
                            const media = [];
                            if (legacy.extended_entities?.media) {
                                legacy.extended_entities.media.forEach(m => {
                                    media.push({
                                        type: m.type,
                                        url: m.media_url_https,
                                        expandedUrl: m.expanded_url,
                                        sizes: m.sizes,
                                        mediaKey: m.media_key
                                    });
                                });
                            }

                            // Parse entities (hashtags, URLs, mentions, symbols)
                            const entities = {
                                hashtags: legacy.entities?.hashtags?.map(h => ({
                                    text: h.text,
                                    indices: h.indices
                                })) || [],
                                urls: legacy.entities?.urls?.map(u => ({
                                    url: u.url,
                                    expandedUrl: u.expanded_url,
                                    displayUrl: u.display_url,
                                    indices: u.indices
                                })) || [],
                                userMentions: legacy.entities?.user_mentions?.map(m => ({
                                    id: m.id_str,
                                    name: m.name,
                                    screenName: m.screen_name,
                                    indices: m.indices
                                })) || [],
                                symbols: legacy.entities?.symbols?.map(s => ({
                                    text: s.text,
                                    indices: s.indices
                                })) || []
                            };

                            // Parse quoted tweet if exists
                            /*
                            let quotedTweet = null;
                            if (tweetResult.quoted_status_result?.result) {
                                const quoted = tweetResult.quoted_status_result.result;
                                const quotedLegacy = quoted.legacy;
                                const quotedUser = quoted.core?.user_results?.result?.legacy;

                                quotedTweet = {
                                    id: quotedLegacy?.id_str,
                                    text: quotedLegacy?.full_text,
                                    createdAt: quotedLegacy?.created_at,
                                    user: {
                                        id: quotedUser?.id_str,
                                        name: quotedUser?.name,
                                        screenName: quotedUser?.screen_name,
                                        verified: quotedUser?.verified || false,
                                        followersCount: quotedUser?.followers_count,
                                        profileImageUrl: quoted.core?.user_results?.result?.avatar?.image_url
                                    },
                                    metrics: {
                                        retweets: quotedLegacy?.retweet_count,
                                        likes: quotedLegacy?.favorite_count,
                                        replies: quotedLegacy?.reply_count,
                                        quotes: quotedLegacy?.quote_count,
                                        views: quoted.views?.count || 0
                                    }
                                };
                            }
                            */
                            // Build comprehensive tweet object
                            tweets.push({
                                // Basic tweet info
                                id: legacy.id_str,
                                text: legacy.full_text,
                                createdAt: legacy.created_at,
                                //conversationId: legacy.conversation_id_str,
                                lang: legacy.lang,

                                // User info
                                user: {
                                    id: userResult?.rest_id,
                                    name: userCore?.name || userLegacy?.name || "Unknown",
                                    screenName: userCore?.screen_name || userLegacy?.screen_name || "unknown",
                                    verified: userLegacy?.verified || false,
                                    //isBlueVerified: userResult?.is_blue_verified || false,
                                    description: userLegacy?.description,
                                    //followersCount: userLegacy?.followers_count,
                                    //followingCount: userLegacy?.friends_count,
                                    //tweetsCount: userLegacy?.statuses_count,
                                    //createdAt: userCore?.created_at,
                                    //profileImageUrl: userResult?.avatar?.image_url,
                                    //profileBannerUrl: userLegacy?.profile_banner_url,
                                },

                                // Metrics
                                metrics: {
                                    retweets: legacy.retweet_count,
                                    likes: legacy.favorite_count,
                                    replies: legacy.reply_count,
                                    quotes: legacy.quote_count,
                                    bookmarks: legacy.bookmark_count,
                                    views: tweetResult.views?.count || 0
                                },

                                // Engagement status
                                /*
                                engagement: {
                                    favorited: legacy.favorited,
                                    retweeted: legacy.retweeted,
                                    bookmarked: legacy.bookmarked
                                },
                                */
                                // Content
                                //entities: entities,
                                //media: media,
                                //quotedTweet: quotedTweet,
                                //isQuoteStatus: legacy.is_quote_status,
                                //quotedStatusId: legacy.quoted_status_id_str,

                                // Metadata
                                //source: tweetResult.source,
                                //possiblySensitive: legacy.possibly_sensitive,
                                //displayTextRange: legacy.display_text_range,

                                // Edit info
                                //editControl: tweetResult.edit_control ? {
                                //editTweetIds: tweetResult.edit_control.edit_tweet_ids,
                                //editableUntil: tweetResult.edit_control.editable_until_msecs,
                                //isEditEligible: tweetResult.edit_control.is_edit_eligible,
                                //editsRemaining: tweetResult.edit_control.edits_remaining
                                //} : null,

                                // URLs
                                url: `https://x.com/${userCore?.screen_name || userLegacy?.screen_name || 'unknown'}/status/${legacy.id_str}`,

                                // Raw entry data for advanced use
                                //entryId: entry.entryId,
                                //sortIndex: entry.sortIndex
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error parsing tweets:", error);
    }

    return tweets;
}

(async () => {
    // Start Xvfb
    const xvfb = new Xvfb({
        silent: true,
        xvfb_args: ['-screen', '0', '1920x1080x24', '-ac', '+extension', 'GLX']
    });

    try {
        console.log('🖥️  Starting virtual display...');
        xvfb.startSync();
        console.log('✅ Virtual display started:', process.env.DISPLAY);

        console.log("🚀 Fetching #SRC20 timeline using browser context...\n");

        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            executablePath: '/usr/bin/brave-browser', // Use Brave browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--start-maximized',
                `--display=${process.env.DISPLAY}` // Use the virtual display
            ]
        });

        const page = await browser.newPage();

        // Set cookies from cookie.json
        console.log("🍪 Setting cookies from cookie.json...");
        await page.setCookie(
            {
                name: 'auth_token',
                value: cookies.auth_token,
                domain: '.x.com',
                path: '/',
                httpOnly: true,
                secure: true
            },
            {
                name: 'ct0',
                value: cookies.ct0,
                domain: '.x.com',
                path: '/',
                secure: true
            },
            {
                name: 'twid',
                value: cookies.twid,
                domain: '.x.com',
                path: '/',
                secure: true
            },
            {
                name: 'lang',
                value: 'en',
                domain: '.x.com',
                path: '/',
                secure: true
            }
        );

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        let timelineData = null;

        // Intercept the SearchTimeline response
        page.on('response', async response => {
            const url = response.url();

            if (url.includes('SearchTimeline')) {
                console.log('✅ Captured SearchTimeline response!\n');

                try {
                    const data = await response.json();
                    timelineData = data;

                    console.log('📊 Timeline data received');
                    // Parse tweets using the parseTweets function
                    const tweets = parseTweets(data);

                    // Display tweet information
                    console.log('🐦 Tweets found:');
                    console.log('─'.repeat(60));

                    tweets.forEach((tweet, index) => {
                        console.log(`\n${index + 1}. @${tweet.user.screenName}`);
                        console.log(`   ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
                        console.log(`   ❤️  ${tweet.metrics.likes} | 🔁 ${tweet.metrics.retweets} | 👁️  ${tweet.metrics.views}`);
                        console.log(`   🔗 ${tweet.url}`);
                    });

                    console.log('\n' + '─'.repeat(60));
                    console.log(`\n✅ Total tweets: ${tweets.length}`);

                    // Save parsed tweets to a separate file
                    fs.writeFileSync(
                        path.join(__dirname, '3_searchTweets_1_result.json'),
                        JSON.stringify(tweets, null, 2)
                    );
                    console.log(` Parsed tweets saved to: 3_searchTweets_1_result.json\n`);

                } catch (err) {
                    console.error('❌ Error parsing response:', err.message);
                }
            }
        });

        console.log("👉 Navigating to X search page...");
        await page.goto('https://x.com/search?q=%23SRC20&src=typed_query&f=live', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for timeline data to be captured
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (timelineData) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 15000);
        });

        await browser.close();

        if (!timelineData) {
            console.log('❌ No timeline data was captured');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        if (xvfb) {
            console.log('🛑 Stopping virtual display...');
            xvfb.stopSync();
        }
        console.log('✅ Done!');
        process.exit(0);
    }
})();

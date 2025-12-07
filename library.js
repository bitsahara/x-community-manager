import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load cookies from cookie.json file
 * @returns {Object} Cookies object with auth_token, ct0, and twid
 */
export function loadCookies() {
    const cookiePath = path.join(__dirname, 'cookie.json');

    if (!fs.existsSync(cookiePath)) {
        throw new Error('cookie.json not found! Please run 1_get_cookie.js first to generate cookies.');
    }

    const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
    return JSON.parse(cookieContent);
}

/**
 * Load environment variables from .env file (for backwards compatibility)
 * @returns {Object} Environment variables as key-value pairs
 */
export function loadEnv() {
    // For backwards compatibility, return cookies in env format
    const cookies = loadCookies();
    return {
        AUTH_TOKEN: cookies.auth_token,
        CT0: cookies.ct0,
        TWID: cookies.twid
    };
}

/**
 * Load captured request data from captured_request.json
 * @returns {Object} Captured request data including headers and URL
 */
export function loadCapturedRequest() {
    const capturedPath = path.join(__dirname, 'captured_request.json');
    const capturedContent = fs.readFileSync(capturedPath, 'utf-8');
    return JSON.parse(capturedContent);
}



/**
 * Build cookie string from cookies object
 * @param {Object} cookies - Cookies object (can be from loadCookies or loadEnv)
 * @returns {string} Cookie string formatted for HTTP headers
 */
export function buildCookieString(cookies) {
    // Support both cookie.json format and env format
    const authToken = cookies.auth_token || cookies.AUTH_TOKEN;
    const ct0 = cookies.ct0 || cookies.CT0;
    const twid = cookies.twid || cookies.TWID;

    return `auth_token=${authToken}; ct0=${ct0}; twid=${twid}; lang=en`;
}

/**
 * Get common headers for Twitter API requests
 * @param {Object} env - Environment variables
 * @param {Object} capturedRequest - Captured request data
 * @param {Object} options - Optional header overrides
 * @returns {Object} Headers object for fetch requests
 */
export function getCommonHeaders(env, capturedRequest, options = {}) {
    const authorization = capturedRequest.headers['authorization'];
    const xXpForwardedFor = capturedRequest.headers['x-xp-forwarded-for'];
    const userAgent = capturedRequest.headers['user-agent'] || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

    //const cookieString = buildCookieString(env);
    const cookieString = capturedRequest.headers['cookie'];

    // Use captured transaction ID because generating a valid one is complex
    // Twitter validates this ID against the request details
    const xClientTransactionId = capturedRequest.headers['x-client-transaction-id'];

    return {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'authorization': authorization,
        'content-type': 'application/json',
        'cookie': cookieString,
        'sec-ch-ua': '"Not_A Brand";v="99", "Chromium";v="142"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': userAgent,
        'x-client-transaction-id': xClientTransactionId,
        'x-csrf-token': env.CT0,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en',
        'x-xp-forwarded-for': xXpForwardedFor,
        ...options // Allow overriding specific headers
    };
}

/**
 * Get Twitter API search features configuration
 * @returns {Object} Features object for search queries
 */
export function getSearchFeatures() {
    return {
        rweb_video_screen_enabled: false,
        profile_label_improvements_pcf_label_in_post_enabled: true,
        responsive_web_profile_redirect_enabled: false,
        rweb_tipjar_consumption_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        premium_content_api_read_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        responsive_web_grok_analyze_button_fetch_trends_enabled: false,
        responsive_web_grok_analyze_post_followups_enabled: true,
        responsive_web_jetfuel_frame: true,
        responsive_web_grok_share_attachment_enabled: true,
        articles_preview_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        responsive_web_grok_show_grok_translated_post: false,
        responsive_web_grok_analysis_button_from_backend: true,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_grok_image_annotation_enabled: true,
        responsive_web_grok_imagine_annotation_enabled: true,
        responsive_web_grok_community_note_auto_translation_is_enabled: false,
        responsive_web_enhance_cards_enabled: false
    };
}

/**
 * Extract tweet data from timeline entry
 * @param {Object} entry - Timeline entry from Twitter API response
 * @returns {Object|null} Extracted tweet data or null if invalid
 */
export function extractTweet(entry) {
    if (!entry?.content?.itemContent?.tweet_results?.result) return null;

    const result = entry.content.itemContent.tweet_results.result;
    const tweet = result.tweet || result; // Handle TweetWithVisibilityResults

    if (!tweet.legacy) return null;

    const legacy = tweet.legacy;
    const userResult = tweet.core?.user_results?.result;

    if (!userResult) return null;

    const userLegacy = userResult.legacy;
    const userCore = userResult.core;

    if (!userLegacy) return null;

    return {
        id: legacy.id_str,
        text: legacy.full_text,
        createdAt: legacy.created_at,
        lang: legacy.lang,
        user: {
            id: userResult.rest_id,
            name: userCore?.name || userLegacy.name,
            screenName: userCore?.screen_name || userLegacy.screen_name,
            verified: userLegacy.verified || false,
            description: userLegacy.description
        },
        metrics: {
            retweets: legacy.retweet_count,
            likes: legacy.favorite_count,
            replies: legacy.reply_count,
            quotes: legacy.quote_count,
            bookmarks: legacy.bookmark_count,
            views: tweet.views?.count || "0"
        },
        url: `https://x.com/${userCore?.screen_name || userLegacy.screen_name}/status/${legacy.id_str}`
    };
}

/**
 * Search for tweets using Twitter API
 * @param {string} query - Search query (e.g., "#SRC20")
 * @param {Object} options - Search options
 * @param {number} options.count - Number of tweets to fetch (default: 40)
 * @param {string} options.product - Search product type: "Top" or "Latest" (default: "Top")
 * @returns {Promise<Array>} Array of tweet objects
 */
export async function searchTweets(query, options = {}) {
    const { count = 20, product = "Top" } = options;

    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const variables = {
        rawQuery: query,
        count: count,
        querySource: "typed_query",
        product: product,
        withGrokTranslatedBio: false
    };

    const features = getSearchFeatures();

    const url = `https://x.com/i/api/graphql/bshMIjqDk8LTXTq4w91WKw/SearchTimeline?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;

    const headers = getCommonHeaders(env, capturedRequest, {
        'referer': `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`,
        'priority': 'u=1, i'
    });

    const response = await fetch(url, {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    let tweets = [];
    try {
        const instructions = data.data.search_by_raw_query.search_timeline.timeline.instructions;
        const addEntries = instructions.find(i => i.entries);
        if (addEntries) {
            tweets = addEntries.entries
                .map(extractTweet)
                .filter(t => t !== null);
        }
    } catch (e) {
        console.error('Error parsing timeline:', e);
    }

    return tweets;
}

/**
 * Like a tweet
 * @param {string} tweetId - Tweet ID to like
 * @returns {Promise<Object>} API response data
 */
export async function likeTweet(tweetId) {
    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const url = 'https://x.com/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet';

    const headers = getCommonHeaders(env, capturedRequest, {
        'origin': 'https://x.com',
        'referer': 'https://x.com/'
    });

    const body = {
        variables: {
            tweet_id: tweetId
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("❌ Error response from X API:", err);
        throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Unlike a tweet
 * @param {string} tweetId - Tweet ID to unlike
 * @returns {Promise<Object>} API response data
 */
export async function unlikeTweet(tweetId) {
    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const url = 'https://x.com/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet';

    const headers = getCommonHeaders(env, capturedRequest, {
        'origin': 'https://x.com',
        'referer': 'https://x.com/'
    });

    const body = {
        variables: {
            tweet_id: tweetId
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("❌ Error response from X API:", err);
        throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Retweet a tweet
 * @param {string} username - Username of the tweet owner
 * @param {string} tweetId - Tweet ID to retweet
 * @returns {Promise<Object>} API response data
 */
export async function createRetweet(username, tweetId) {
    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const url = 'https://x.com/i/api/graphql/LFho5rIi4xcKO90p9jwG7A/CreateRetweet';

    const headers = getCommonHeaders(env, capturedRequest, {
        'origin': 'https://x.com',
        'referer': 'https://x.com/' + username + '/status/' + tweetId,
        'priority': 'u=1, i'
    });

    const body = {
        variables: {
            tweet_id: tweetId,
            dark_request: false
        },
        queryId: "LFho5rIi4xcKO90p9jwG7A"
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("❌ Error response from X API:", err);
        throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Delete a retweet (unretweet)
 * @param {string} tweetId - Tweet ID to unretweet
 * @returns {Promise<Object>} API response data
 */
export async function deleteRetweet(tweetId) {
    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const url = 'https://x.com/i/api/graphql/G4MoqBiE6aqyo4QWAgCy4w/DeleteRetweet';

    const headers = getCommonHeaders(env, capturedRequest, {
        'origin': 'https://x.com',
        'referer': 'https://x.com/',
        'priority': 'u=1, i'
    });

    const body = {
        variables: {
            source_tweet_id: tweetId,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("❌ Error response from X API:", err);
        throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Create a new tweet
 * @param {string} tweetText - The text content of the tweet
 * @param {Object} options - Optional parameters
 * @param {Array} options.media - Array of media entities (default: [])
 * @param {boolean} options.possiblySensitive - Mark media as sensitive (default: false)
 * @returns {Promise<Object>} API response data
 */
export async function createTweet(tweetText, options = {}) {
    const { media = [], possiblySensitive = false } = options;

    const env = loadEnv();
    const capturedRequest = loadCapturedRequest();

    const url = 'https://x.com/i/api/graphql/TAJw1rBsjAtdNgTdlo2oeg/CreateTweet';

    const headers = getCommonHeaders(env, capturedRequest, {
        'origin': 'https://x.com',
        'referer': 'https://x.com/compose/post',
        'priority': 'u=1, i'
    });

    const body = {
        variables: {
            tweet_text: tweetText,
            dark_request: false,
            media: {
                media_entities: media,
                possibly_sensitive: possiblySensitive
            },
            semantic_annotation_ids: [],
            disallowed_reply_options: null
        },
        features: {
            premium_content_api_read_enabled: false,
            communities_web_enable_tweet_community_results_fetch: true,
            c9s_tweet_anatomy_moderator_badge_enabled: true,
            responsive_web_grok_analyze_button_fetch_trends_enabled: false,
            responsive_web_grok_analyze_post_followups_enabled: true,
            responsive_web_jetfuel_frame: true,
            responsive_web_grok_share_attachment_enabled: true,
            responsive_web_edit_tweet_api_enabled: true,
            graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
            view_counts_everywhere_api_enabled: true,
            longform_notetweets_consumption_enabled: true,
            responsive_web_twitter_article_tweet_consumption_enabled: true,
            tweet_awards_web_tipping_enabled: false,
            responsive_web_grok_show_grok_translated_post: false,
            responsive_web_grok_analysis_button_from_backend: true,
            creator_subscriptions_quote_tweet_preview_enabled: false,
            longform_notetweets_rich_text_read_enabled: true,
            longform_notetweets_inline_media_enabled: true,
            profile_label_improvements_pcf_label_in_post_enabled: true,
            responsive_web_profile_redirect_enabled: false,
            rweb_tipjar_consumption_enabled: true,
            verified_phone_label_enabled: false,
            articles_preview_enabled: true,
            responsive_web_grok_community_note_auto_translation_is_enabled: false,
            responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
            freedom_of_speech_not_reach_fetch_enabled: true,
            standardized_nudges_misinfo: true,
            tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
            responsive_web_grok_image_annotation_enabled: true,
            responsive_web_grok_imagine_annotation_enabled: true,
            responsive_web_graphql_timeline_navigation_enabled: true,
            responsive_web_enhance_cards_enabled: false
        },
        queryId: "TAJw1rBsjAtdNgTdlo2oeg"
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("❌ Error response from X API:", err);
        throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    return data;
}

export default {
    loadCookies,
    loadEnv,
    loadCapturedRequest,
    buildCookieString,
    getCommonHeaders,
    getSearchFeatures,
    extractTweet,
    searchTweets,
    likeTweet,
    unlikeTweet,
    createRetweet,
    deleteRetweet,
    createTweet
};


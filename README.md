# X Community Manager 🚀

An automated Twitter/X bot for searching, liking, retweeting, and posting tweets. This tool helps manage your X community engagement by automatically interacting with tweets from specified influencers.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Testing Process](#testing-process)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The main workflow is:
1. **Authenticate** with Twitter/X using Google OAuth
2. **Capture** API request headers for subsequent calls
3. **Search** for tweets periodically using specific hashtags/keywords
4. **Filter** tweets from your influencer list
5. **Like** tweets automatically from those influencers

## ✨ Features

- 🔐 Automated Google OAuth login for Twitter/X
- 🔍 Search tweets by hashtag or keyword
- ❤️ Batch like tweets from specific influencers
- 🔁 Retweet functionality (not working)
- 📝 Create new tweets (not working)
- 💾 Persistent storage of tweet data
- 🎲 Random delays to avoid rate limiting
- 📊 Track liked tweets to prevent duplicates

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Brave Browser** installed at `/usr/bin/brave-browser` (or modify the path in the scripts)
- A **Twitter/X account**
- **Google account credentials** for Twitter login

## 🔧 Installation

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

   If you are using a headless server, you will need to install Xvfb:
   ```bash
   sudo ./install_xvfb.sh
   ```

3. **Create a `.env` file** in the root directory with your Google credentials:
   ```env
   GOOGLE_ID=your-google-email@gmail.com
   GOOGLE_PWD=your-google-password
   X_USERNAME=your-x-username
   X_PASSWORD=your-x-password
   ```

4. **Create an `influencers.json` file** with Twitter usernames you want to track:
   ```json
   [
       "username1",
       "username2",
       "username3"
   ]
   ```

## ⚙️ Configuration

### Environment Variables (.env)

- `GOOGLE_ID`: Your Google email address
- `GOOGLE_PWD`: Your Google password

- `X_USERNAME`: Your Twitter username
- `X_PASSWORD`: Your Twitter password

### Influencers List (influencers.json)

Add Twitter usernames (without @) of influencers whose tweets you want to automatically like:

```json
[
    "TheApeBitcoiner",
    "STAMP_on_BTC",
    ...
]
```

## 🧪 Testing Process

Follow these steps in order to test the complete workflow:

---

### **Step 1: Get Authentication Cookies** 🍪

**File:** `1_get_cookie.js`

**Purpose:** Authenticate with Twitter/X and capture essential cookies for API calls.

**How to run:**
```bash
node 1_get_cookie.js
```

**What it does:**
1. Launches Brave browser in non-headless mode
2. Navigates to Twitter/X login page
3. Attempts to auto-login using Google OAuth (using credentials from `.env`)
4. Captures authentication cookies (`auth_token`, `ct0`, `twid`)
5. Saves cookies to `cookie.json`

**Login Methods (in `1_get_cookie.js`):**
- **Method 1**: Standard X/Twitter login using username/password.
- **Method 2**: Google OAuth login (default).
- *Configure this by changing the `method` property in the `TwitterStealthLogin` initialization.*

**Expected output:**
- Browser window opens
- Automatic Google login (or manual if auto-login fails)
- Console shows: `✅ LOGIN SUCCESS! Cookies captured.`
- File created: `cookie.json`

**Manual intervention:**
- If auto-login fails, complete the login manually in the browser
- The script will detect cookies once you're logged in

**Success criteria:**
- ✅ `cookie.json` file created with valid cookies
- ✅ Console shows all three cookies: `auth_token`, `ct0`, `twid`

- ✅ Console shows all three cookies: `auth_token`, `ct0`, `twid`

### **🚀 Headless Deployment Status**

Current status of headless testing for production environments:

- **Google Auth (`method: 2`)**:
  - ✅ Works perfectly.

- **X Email/Password (`method: 1`)**:
  - ⚠️ **Works with limitations**: Tested successfully on a local NUC computer starting without a monitor.
  - ❓ **Ubuntu Cloud Server**: Not tested yet.

---

### **Step 2: Capture API Request Headers** 📡

**File:** `2_capture_request.js`

**Purpose:** Intercept a real Twitter API request to capture proper headers and URL structure.

**How to run:**
```bash
node 2_capture_request.js
```

**What it does:**
1. Launches browser with cookies from Step 1
2. Navigates to Twitter search page (`#BTC`)
3. Intercepts the `SearchTimeline` GraphQL API request
4. Captures headers, URL, and request structure
5. Saves to `captured_request.json`

**Expected output:**
- Browser opens and navigates to search page
- Console shows: `✅ Captured SearchTimeline request!`
- File created: `captured_request.json`

**Success criteria:**
- ✅ `captured_request.json` contains valid headers
- ✅ URL includes GraphQL endpoint and query parameters

**Note:** This step is optional if `captured_request.json` already exists and is valid.

---

### **Step 3: Search for Tweets** 🔍

**File:** `3_searchTweets.js`

**Purpose:** Search for tweets using specific hashtags/keywords and save results.

**How to run:**
```bash
node 3_searchTweets.js
```

**What it does:**
1. Loads cookies from `cookie.json`
2. Searches for tweets matching the query (default: `#SRC-20`)
3. Parses tweet data (text, user, metrics, etc.)
4. Merges with existing tweets in `3_searchTweets_result.json`
5. Preserves `favorited` status from previous runs

**Configuration:**
Edit line 12 in `3_searchTweets.js` to change search query:
```javascript
const query = '#SRC-20'; // Change this to your desired search term
```

Edit line 18-19 for search options:
```javascript
count: 20,           // Number of tweets to fetch
product: 'Latest'    // 'Latest' or 'Top'
```

**Expected output:**
```
🔍 Fetching tweets for #SRC-20...
✅ Found tweets: 20
📊 Tweet details:
────────────────────────────────────────────────────────
1. @username
   Tweet text preview...
   ❤️ 15 | 🔁 3 | 👁️ 1234
...
💾 Saved 20 tweets (20 new/updated, 0 kept from history)
✅ Results saved to: 3_searchTweets_result.json
```

**Success criteria:**
- ✅ Console shows found tweets with details
- ✅ `3_searchTweets_result.json` created/updated with tweet data
- ✅ No authentication errors

**Periodic execution:**
Run this script periodically (e.g., via cron job) to fetch new tweets:
```bash
# Example: Run every hour
0 * * * * cd /path/to/x-community-manager && node 3_searchTweets.js
```

---

### **📜 Script Variants (Search Tweets)**

There are three versions of the search script, each serving a different purpose:

1.  **`3_searchTweets.js`**:
    -   **Method**: Uses `fetch` API.
    -   **How it works**: Replicates a curl request copied from a browser.
    -   **Use case**: Simple, lightweight, but requires manually updating headers if they expire.

2.  **`3_searchTweets_1.js`**:
    -   **Method**: Puppeteer (Browser Context).
    -   **How it works**: Launches a visible browser to perform the search and intercept the response.
    -   **Use case**: Debugging, seeing what the bot sees.

3.  **`3_searchTweets_1_headless.js`**:
    -   **Method**: Puppeteer (Headless + Xvfb).
    -   **How it works**: Runs in a virtual display (Xvfb) to simulate a real screen while remaining headless.
    -   **Use case**: **Production**. Best for running on servers or in the background.

---

### **Step 4: Like a Single Tweet** ❤️

**File:** `4_likeTweet.js`

**Purpose:** Test liking/unliking a single tweet by ID.

**How to run:**
```bash
node 4_likeTweet.js
```

**Configuration:**
Uncomment and edit lines 36-37 with a tweet ID:
```javascript
like("1996441734780453040");      // Like this tweet
// unlike("1995810934074261607");  // Or unlike this tweet
```

**Expected output:**
```
❤️ Liking tweet: 1996441734780453040
✅ Tweet liked successfully: { data: { favorite_tweet: 'Done' } }
```

**Success criteria:**
- ✅ Console shows success message
- ✅ Tweet is liked on Twitter/X (verify in browser)

**Note:** This is primarily for testing. Use Step 5 for batch operations.

---

### **Step 5: Batch Like Tweets from Influencers** 🎯

**File:** `5_likeTweets_batch.js`

**Purpose:** Automatically like all tweets from your influencer list that haven't been liked yet.

**How to run:**
```bash
node 5_likeTweets_batch.js
```

**What it does:**
1. Loads tweets from `3_searchTweets_result.json`
2. Loads influencer list from `influencers.json`
3. Filters tweets to only include those from influencers
4. Skips tweets already marked as `favorited: true`
5. Likes each tweet with random delay (3-10 seconds)
6. Marks tweets as `favorited: true` immediately after success
7. Saves updated data back to `3_searchTweets_result.json`

**Expected output:**
```
📋 Loaded 7 influencers from influencers.json
Influencers: ElProfessorX100, TheApeBitcoiner, STAMP_on_BTC, ...

🔥 Found 15 tweets from influencers (out of 20 total tweets)
📌 5 tweets need to be liked (10 already favorited)
Will like them with a random delay of 3-10 seconds each.

====================================
(1/5) ❤️ Liking tweet ID: 1234567890
User: @ElProfessorX100
Text: Check out this amazing #SRC-20 project...

❤️ Liking tweet: 1234567890
✅ Tweet liked successfully: { data: { favorite_tweet: 'Done' } }
✅ Marked tweet 1234567890 as favorited in JSON
💾 Saved updated tweets to file
⏳ Sleeping for 7.3 seconds before next like...

...

🎉 All tweets processed!
```

**Success criteria:**
- ✅ Only tweets from influencers are processed
- ✅ Already favorited tweets are skipped
- ✅ Each tweet is liked successfully
- ✅ `3_searchTweets_result.json` updated with `favorited: true`
- ✅ Random delays between likes (3-10 seconds)

**Automated workflow:**
Combine Steps 3 and 5 in a cron job for full automation:
```bash
# Run every 2 hours: search for new tweets and like them
0 */2 * * * cd /path/to/x-community-manager && node 3_searchTweets.js && node 5_likeTweets_batch.js
```

## 📁 File Structure

```
x-community-manager/
├── 1_get_cookie.js              # Step 1: Get authentication cookies
├── 2_capture_request.js         # Step 2: Capture API headers
├── 3_searchTweets.js            # Step 3: Search for tweets
├── 3_searchTweets_result.json   # Stored tweet data
├── 4_likeTweet.js               # Step 4: Like/unlike single tweet
├── 5_likeTweets_batch.js        # Step 5: Batch like influencer tweets
├── 6_reTweet.js                 # Step 6: Retweet functionality (not working)
├── 7_createTweet.js             # Step 7: Create new tweets (not working)
├── library.js                   # Shared API functions
├── cookie.json                  # Authentication cookies (generated)
├── captured_request.json        # API headers (generated)
├── influencers.json             # List of influencers to track for likes
├── .env                         # Google credentials (create this)
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

## 🔄 Complete Automation Workflow

- Todo

## 🐛 Troubleshooting

### Authentication Errors (401)

**Problem:** `Authorization` or `401 Unauthorized` errors

**Solutions:**
1. Re-run `1_get_cookie.js` to refresh cookies
2. Check if `cookie.json` exists and has valid data
3. Ensure your Twitter account is not locked or suspended
4. Verify cookies haven't expired (they typically last 30 days)

### No Tweets Found

**Problem:** Search returns 0 tweets

**Solutions:**
1. Verify the search query is correct
2. Check if tweets exist for that hashtag/keyword on Twitter
3. Try changing `product: 'Latest'` to `product: 'Top'`
4. Ensure cookies are valid

### Browser Launch Errors

**Problem:** `executablePath` error or browser won't launch

**Solutions:**
1. Verify Brave browser is installed: `which brave-browser`
2. Update the path in scripts if Brave is in a different location
3. Or use Chrome/Chromium by changing `executablePath: '/usr/bin/google-chrome'`

### Rate Limiting

**Problem:** Too many requests error

**Solutions:**
1. Increase delay between likes in `5_likeTweets_batch.js` (line 10)
2. Reduce tweet count in `3_searchTweets.js` (line 18)
3. Run scripts less frequently

### Duplicate Likes

**Problem:** Script tries to like already-liked tweets

**Solutions:**
1. Ensure `3_searchTweets_result.json` is not corrupted
2. Check that `favorited: true` is being saved correctly
3. Don't manually edit the JSON file

### Google Auto-Login Fails

**Problem:** Step 1 doesn't auto-login with Google

**Solutions:**
1. Complete login manually in the browser window
2. Check `.env` file has correct credentials
3. Ensure Google account doesn't have 2FA enabled (or handle it manually)
4. Wait for the script to detect cookies after manual login

## 🔒 Security Notes

- **Never commit `.env` or `cookie.json`** to version control
- `.gitignore` is configured to exclude sensitive files
- Cookies expire after ~30 days, refresh as needed
- Use app-specific passwords if using 2FA

## 📝 License

This project is for educational purposes. Use responsibly and comply with Twitter's Terms of Service and API usage policies.

## 🤝 Contributing

Feel free to submit issues or pull requests for improvements!

---

**Happy Tweeting! 🐦✨**

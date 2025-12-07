// x-login-stealth.js
import Xvfb from 'xvfb';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// Use stealth plugin with all evasions
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class TwitterStealthLogin {
    constructor(config) {
        this.config = config;
        this.xvfb = null;
        this.browser = null;
        this.page = null;
        this.userDataDir = './twitter-profile_headless'; // Persistent profile
        this.useXvfb = config.useXvfb; // Control Xvfb usage
    }

    async init() {
        // Start Xvfb
        if (this.useXvfb) {
            this.xvfb = new Xvfb({
                silent: true,
                xvfb_args: ['-screen', '0', '1920x1080x24', '-ac', '+extension', 'GLX']
            });

            console.log('🖥️  Starting virtual display...');
            this.xvfb.startSync();
            console.log('✅ Virtual display started:', process.env.DISPLAY);
        }

        // Create user data directory if not exists
        try {
            await fs.mkdir(this.userDataDir, { recursive: true });
        } catch (e) { }

        // Launch browser with maximum stealth
        console.log('🌐 Launching browser with stealth mode...');
        this.browser = await puppeteer.launch({
            headless: false,
            userDataDir: this.userDataDir, // Persistent cookies/localStorage
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                `--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
                '--lang=en-US,en;q=0.9',
                '--disable-notifications',
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            defaultViewport: null
        });

        // Get existing pages or create new
        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

        // Maximum stealth setup
        await this.setupStealthPage();

        console.log('✅ Browser ready with maximum stealth');
    }

    async setupStealthPage() {
        // Remove webdriver traces
        await this.page.evaluateOnNewDocument(() => {
            // Overwrite navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            // Overwrite Chrome object
            window.chrome = {
                runtime: {},
            };

            // Overwrite permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Plugin array
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });

        // Set realistic viewport
        await this.page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });

        // Set extra headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        });

        // Random mouse movements
        await this.page.evaluateOnNewDocument(() => {
            // Simulate random mouse movements
            setInterval(() => {
                const event = new MouseEvent('mousemove', {
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight
                });
                document.dispatchEvent(event);
            }, Math.random() * 5000 + 3000);
        });
    }

    // Enhanced human delay with more randomness
    async humanDelay(min = 800, max = 2000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // More human-like typing with mistakes
    async humanType(selector, text, options = {}) {
        if (!text) {
            throw new Error(`Text to type into ${selector} is undefined or empty`);
        }
        await this.page.waitForSelector(selector, { visible: true, timeout: 15000 });

        // Click with offset
        const element = await this.page.$(selector);
        const box = await element.boundingBox();
        const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
        const y = box.y + box.height / 2 + (Math.random() * 10 - 5);

        await this.page.mouse.click(x, y);
        await this.humanDelay(300, 800);

        // Type with random delays and occasional mistakes
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 3% chance of typo (then correct it)
            if (Math.random() < 0.03 && i < text.length - 1) {
                const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
                await this.page.keyboard.type(wrongChar, {
                    delay: Math.random() * 150 + 80
                });
                await this.humanDelay(100, 300);
                await this.page.keyboard.press('Backspace');
                await this.humanDelay(100, 200);
            }

            await this.page.keyboard.type(char, {
                delay: Math.random() * 180 + 70
            });

            // Random pauses (simulating thinking)
            if (Math.random() < 0.1) {
                await this.humanDelay(200, 500);
            }
        }
    }

    // Enhanced button clicking
    async humanClick(selector, textMatch = null) {
        await this.page.waitForSelector(selector, { visible: true, timeout: 15000 });

        const elements = await this.page.$$(selector);

        let targetElement = null;

        if (textMatch) {
            for (const el of elements) {
                const text = await this.page.evaluate(element => element.innerText, el);
                if (text && (text.includes(textMatch) || text.toLowerCase().includes(textMatch.toLowerCase()))) {
                    targetElement = el;
                    console.log(`   ✓ Found button with text: "${text}"`);
                    break;
                }
            }
        }

        if (!targetElement && elements.length > 0) {
            targetElement = elements[0];
            console.log('   ℹ Using first matching element');
        }

        if (!targetElement) {
            throw new Error(`Element not found: ${selector}`);
        }

        // Move mouse naturally to element
        const box = await targetElement.boundingBox();
        if (box) {
            // Move to random position near button first
            await this.page.mouse.move(
                box.x - 50 + Math.random() * 100,
                box.y - 50 + Math.random() * 100,
                { steps: Math.floor(Math.random() * 10) + 5 }
            );
            await this.humanDelay(100, 300);

            // Move to button
            const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
            const y = box.y + box.height / 2 + (Math.random() * 20 - 10);

            await this.page.mouse.move(x, y, {
                steps: Math.floor(Math.random() * 5) + 3
            });
            await this.humanDelay(100, 300);
        }

        await targetElement.click();
    }

    // Scroll page naturally
    async humanScroll() {
        await this.page.evaluate(() => {
            window.scrollBy({
                top: Math.random() * 300 + 100,
                behavior: 'smooth'
            });
        });
        await this.humanDelay(500, 1000);
    }

    async initLogin() {
        console.log(`🔗 Navigating to https://x.com/home...`);

        // Navigate to home directly to check login status
        // Using domcontentloaded is faster and less prone to timeouts than networkidle0
        try {
            await this.page.goto('https://x.com/home', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
        } catch (e) {
            console.log('⚠️ Initial navigation warning:', e.message);
            // Continue anyway, as we might still be on the page
        }

        await this.humanDelay(3000, 5000);
        await this.humanScroll();

        // Check if already logged in
        const isLoggedInInitial = await this.page.evaluate(() => {
            return document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null ||
                document.querySelector('[aria-label="Home timeline"]') !== null ||
                window.location.pathname === '/home';
        });

        if (isLoggedInInitial) {
            console.log('✅ Already logged in! Skipping login flow...');
            return await this.captureCookies();
        }

        return isLoggedInInitial;

    }
    async login() {
        try {

            let isLoggedInInitial = await this.initLogin();
            if (isLoggedInInitial) {
                console.log('✅ Already logged in! Skipping login flow...');
                return await this.captureCookies();
            }

            console.log('ℹ️ Not logged in. Proceeding to login page...');


            //METHOD 1
            if (this.config.method === 1) {

                // Now go to login
                await this.page.goto(this.config.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                await this.humanDelay(3000, 5000);
                // Small scroll to trigger any lazy loading
                await this.humanScroll();

                // --- Step 1: Username ---
                console.log('👤 Entering username...');
                await this.humanType(
                    this.config.selectors.username,
                    this.config.credentials.username
                );
                await this.humanDelay(1500, 2500);

                // Click Next
                console.log('➡️  Clicking Next...');
                await this.humanClick(
                    this.config.selectors.nextButton,
                    'Next'
                );
                // Wait for password field
                await this.humanDelay(3000, 5000);

                // Check for unusual activity screen
                const pageContent = await this.page.content();
                if (pageContent.includes('unusual') || pageContent.includes('verify') || pageContent.includes('phone')) {
                    console.log('⚠️  Unusual activity detected screen - may need manual intervention');
                }

                // --- Step 2: Password ---
                console.log('🔑 Entering password...');
                await this.humanType(
                    this.config.selectors.password,
                    this.config.credentials.password
                );
                await this.humanDelay(1500, 2500);

                // --- Step 3: Login ---
                console.log('🖱️  Clicking login...');
                await this.humanClick(
                    this.config.selectors.loginButton,
                    'Log in'
                );
            } else if (this.config.method === 2) {
                console.log('ℹ️ Using Google login...');
                await this.googleLogin();
            }




            return await this.captureCookies();

        } catch (error) {
            console.error('❌ Login error:', error.message);
            console.error('Stack:', error.stack);

            try {
                // await this.page.screenshot({ path: 'error.png', fullPage: true });
                //console.log('📸 Error screenshot saved: error.png');

            } catch (e) {
                console.error('Failed to save error info:', e.message);
            }

            return false;
        }
    }

    async googleLogin() {
        try {
            console.log("🔍 Looking for 'Sign in with Google' button...");

            // Wait for the Google sign-in container (it contains an iframe)
            let googleButtonFound = false;

            try {
                // Wait for the Google sign-in container
                await this.page.waitForSelector('div[data-testid="google_sign_in_container"]', { timeout: 10000 });
                console.log("✅ Found Google sign-in container");

                // The Google button is inside an iframe, we need to click on the container area
                // or wait for the iframe to load and interact with it
                await new Promise(r => setTimeout(r, 2000)); // Wait for iframe to fully load

                // Try to click the iframe area (the button inside will receive the click)
                const googleContainer = await this.page.$('div[data-testid="google_sign_in_container"]');
                if (googleContainer) {
                    // Get the bounding box and click in the center
                    const box = await googleContainer.boundingBox();
                    if (box) {
                        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        console.log("✅ Clicked Google sign-in button");
                        googleButtonFound = true;
                    }
                }
            } catch (e) {
                console.log("⚠️  Could not find Google sign-in container:", e.message);
            }

            if (googleButtonFound) {
                // Wait for the popup window to open
                console.log("⏳ Waiting for Google login popup...");
                const popupPromise = new Promise(resolve => {
                    this.browser.once('targetcreated', async target => {
                        if (target.type() === 'page') {
                            const newPage = await target.page();
                            resolve(newPage);
                        }
                    });
                });

                // Wait for popup with timeout
                const googlePage = await Promise.race([
                    popupPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Popup timeout')), 10000))
                ]).catch(() => null);

                if (!googlePage) {
                    console.log("⚠️  No popup detected, trying same page...");
                    await new Promise(r => setTimeout(r, 2000));
                }

                const loginPage = googlePage || this.page;
                console.log("🔐 Filling in Google credentials...");

                // Wait for email input
                await loginPage.waitForSelector('input[type="email"]', { timeout: 10000 });
                await loginPage.type('input[type="email"]', process.env.GOOGLE_ID, { delay: 100 });

                console.log("📧 Email entered");
                await this.humanDelay(1500, 2500);

                // Click Next button using ID selector
                await loginPage.click('#identifierNext');
                console.log("⏳ Waiting for password page...");
                // Wait for password field
                await this.humanDelay(3000, 5000);

                // Wait for password input
                await loginPage.waitForSelector('input[type="password"]', { timeout: 10000 });
                await loginPage.type('input[type="password"]', process.env.GOOGLE_PWD, { delay: 100 });

                console.log("🔑 Password entered");
                await this.humanDelay(1500, 2500);

                // Click Next/Sign in button using ID selector
                await loginPage.click('#passwordNext');

                console.log("✅ Google login submitted, waiting for redirect...");
                await new Promise(r => setTimeout(r, 5000));

                console.log("✅ Login process completed");
            } else {
                console.log("⚠️  Could not find Google sign-in button, proceeding with manual login...");
            }

        } catch (error) {
            console.log("⚠️  Error during Google auto-login:", error.message);
            console.log("📝 Please complete login manually...");
        }
    }

    async captureCookies() {
        console.log("⏳ Scanning for cookies (Robust Method)...");

        // Poll for cookies for a limited time (e.g., 30 seconds)
        const startTime = Date.now();
        while (Date.now() - startTime < 30000) {
            try {
                // Get cookies from the page (this can access HttpOnly cookies)
                const cookies = await this.page.cookies();

                // Also try CDP method for comparison
                const client = await this.page.target().createCDPSession();
                const cdpResult = await client.send('Network.getAllCookies');
                const cdpCookies = cdpResult.cookies;

                // Merge both cookie sources
                const allCookiesMap = new Map();
                cdpCookies.forEach(c => allCookiesMap.set(c.name, c));
                cookies.forEach(c => allCookiesMap.set(c.name, c));

                const allCookies = Array.from(allCookiesMap.values());

                // Extract important cookies
                const authToken = allCookies.find(c => c.name === 'auth_token')?.value;
                const ct0 = allCookies.find(c => c.name === 'ct0')?.value;
                const twid = allCookies.find(c => c.name === 'twid')?.value;

                if (authToken && ct0) {
                    console.log("✅ Cookies captured successfully.");
                    console.log(`\n📊 Total cookies found: ${allCookies.length}\n`);

                    console.log("───────────────────────────────────────────────────");
                    console.log("🔑 ESSENTIAL COOKIES:");
                    console.log("───────────────────────────────────────────────────");
                    console.log(`auth_token="${authToken}"`);
                    console.log(`ct0="${ct0}"`);
                    console.log(`twid="${twid || 'NOT FOUND'}"`);

                    // Save cookies to cookie.json (Standard format)
                    const cookieData = {
                        auth_token: authToken,
                        ct0: ct0,
                        twid: twid || 'NOT FOUND',
                        timestamp: new Date().toISOString()
                    };

                    await fs.writeFile('cookie.json', JSON.stringify(cookieData, null, 2));
                    console.log("💾 Cookies saved to cookie.json");

                    return true;
                }

                await new Promise(r => setTimeout(r, 1000));

            } catch (err) {
                console.error("⚠️ Error during cookie capture:", err.message);
                break;
            }
        }

        console.log('⚠️ Failed to capture essential cookies (auth_token/ct0) within timeout.');
        return false;
    }



    async cleanup() {
        console.log('🧹 Cleaning up...');

        if (this.page) {
            await this.page.close().catch(() => { });
        }

        if (this.browser) {
            await this.browser.close().catch(() => { });
            console.log('✅ Browser closed');
        }

        if (this.xvfb && this.useXvfb) {
            this.xvfb.stopSync();
            console.log('✅ Virtual display stopped');
        }
    }
}

// Usage
async function main() {


    const bot = new TwitterStealthLogin({
        url: 'https://x.com/i/flow/login',
        credentials: {
            username: process.env.X_USERNAME,
            password: process.env.X_PASSWORD
        },
        selectors: {
            username: 'input[autocomplete="username"]',
            nextButton: 'button[role="button"]',
            password: 'input[name="password"]',
            loginButton: 'button[data-testid="LoginForm_Login_Button"]'
        },
        useXvfb: true, // ← Set to true for server with Xvfb
        method: 1, // ← Set to 1 for traditional email/password login and 2 for Google auto-login
    });

    // Validate credentials
    if (!process.env.X_USERNAME || !process.env.X_PASSWORD) {
        console.error('❌ Missing credentials in .env file!');
        console.error('Please ensure X_USERNAME and X_PASSWORD are set.');
        process.exit(1);
    }

    try {
        await bot.init();
        const success = await bot.login();

        if (success) {
            console.log('🎉 Successfully logged into X/Twitter!');

            // Keep browser open for a bit to simulate real user
            console.log('⏳ Keeping session active for 30 seconds...');
            await new Promise(resolve => setTimeout(resolve, 30000));

        } else {
            console.log('😞 Login failed - check screenshots for details');
            process.exit(1);
        }
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    } finally {
        await bot.cleanup();
        process.exit(0);
    }
}

main();

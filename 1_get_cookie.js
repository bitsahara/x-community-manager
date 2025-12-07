import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
import { writeFile, rm } from 'fs/promises';

// Load environment variables
dotenv.config();

puppeteer.use(StealthPlugin());

(async () => {
    // Clean up previous browser data
    try {
        await rm('./twitter-profile', { recursive: true, force: true });
        console.log("🧹 Cleaned up previous browser data");
    } catch (err) {
        // Ignore if folder doesn't exist
    }

    console.log("🚀 Launching Fresh Browser...");

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/brave-browser', // Use Brave browser
        userDataDir: "./twitter-profile", // New clean folder
        defaultViewport: null, // Allows full window usage
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--start-maximized', // Open full screen
            // Hide that we are automated
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();

    // 🛑 TRICK: Set a real User Agent so X thinks we are a normal PC
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to the main page first, then click login manually if needed
    console.log("👉 Navigating to X (Twitter) login page...");
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded' });

    // Wait a bit for the page to fully load
    await new Promise(r => setTimeout(r, 3000));

    try {
        console.log("🔍 Looking for 'Sign in with Google' button...");

        // Wait for the Google sign-in container (it contains an iframe)
        let googleButtonFound = false;

        try {
            // Wait for the Google sign-in container
            await page.waitForSelector('div[data-testid="google_sign_in_container"]', { timeout: 10000 });
            console.log("✅ Found Google sign-in container");

            // The Google button is inside an iframe, we need to click on the container area
            // or wait for the iframe to load and interact with it
            await new Promise(r => setTimeout(r, 2000)); // Wait for iframe to fully load

            // Try to click the iframe area (the button inside will receive the click)
            const googleContainer = await page.$('div[data-testid="google_sign_in_container"]');
            if (googleContainer) {
                // Get the bounding box and click in the center
                const box = await googleContainer.boundingBox();
                if (box) {
                    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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
                browser.once('targetcreated', async target => {
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

            const loginPage = googlePage || page;
            console.log("🔐 Filling in Google credentials...");

            // Wait for email input
            await loginPage.waitForSelector('input[type="email"]', { timeout: 10000 });
            await loginPage.type('input[type="email"]', process.env.GOOGLE_ID, { delay: 100 });

            console.log("📧 Email entered");

            // Click Next button using ID selector
            await loginPage.click('#identifierNext');
            console.log("⏳ Waiting for password page...");
            await new Promise(r => setTimeout(r, 3000));

            // Wait for password input
            await loginPage.waitForSelector('input[type="password"]', { timeout: 10000 });
            await loginPage.type('input[type="password"]', process.env.GOOGLE_PWD, { delay: 100 });

            console.log("🔑 Password entered");

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

    console.log("⏳ Scanning for cookies...");

    while (true) {
        try {
            // Get cookies from the page (this can access HttpOnly cookies)
            const cookies = await page.cookies();

            // Also try CDP method for comparison
            const client = await page.target().createCDPSession();
            const cdpResult = await client.send('Network.getAllCookies');
            const cdpCookies = cdpResult.cookies;

            // Merge both cookie sources (page.cookies() is more reliable for HttpOnly)
            const allCookiesMap = new Map();

            // Add CDP cookies first
            cdpCookies.forEach(c => allCookiesMap.set(c.name, c));

            // Override/add with page.cookies() (these include HttpOnly)
            cookies.forEach(c => allCookiesMap.set(c.name, c));

            const allCookies = Array.from(allCookiesMap.values());

            // Extract important cookies
            const authToken = allCookies.find(c => c.name === 'auth_token')?.value;
            const ct0 = allCookies.find(c => c.name === 'ct0')?.value;
            const twid = allCookies.find(c => c.name === 'twid')?.value;


            if (authToken && ct0) {
                console.clear();
                console.log("✅ LOGIN SUCCESS! Cookies captured.");
                console.log(`\n📊 Total cookies found: ${allCookies.length}\n`);

                console.log("───────────────────────────────────────────────────");
                console.log("🔑 ESSENTIAL COOKIES:");
                console.log("───────────────────────────────────────────────────");
                console.log(`auth_token="${authToken}"`);
                console.log(`ct0="${ct0}"`);
                console.log(`twid="${twid || 'NOT FOUND'}"`);

                // Save cookies to cookie.json
                const cookieData = {
                    auth_token: authToken,
                    ct0: ct0,
                    twid: twid || 'NOT FOUND',
                    timestamp: new Date().toISOString()
                };

                try {
                    await writeFile('./cookie.json', JSON.stringify(cookieData, null, 2));
                    console.log("\n💾 Cookies saved to cookie.json");
                } catch (err) {
                    console.log("\n⚠️  Failed to save cookies:", err.message);
                }
                /*
                console.log("\n───────────────────────────────────────────────────");
                console.log("📋 ALL COOKIES:");
                console.log("───────────────────────────────────────────────────");

                // Display all cookies with their properties
                allCookies.forEach(cookie => {
                    const flags = [];
                    if (cookie.httpOnly) flags.push('HttpOnly');
                    if (cookie.secure) flags.push('Secure');
                    if (cookie.sameSite) flags.push(`SameSite=${cookie.sameSite}`);

                    const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
                    const valuePreview = cookie.value.length > 50
                        ? cookie.value.substring(0, 50) + '...'
                        : cookie.value;

                    console.log(`${cookie.name}=${valuePreview}${flagStr}`);
                });
                */
                console.log("Closing in 10 seconds...");
                await new Promise(r => setTimeout(r, 10000));
                await browser.close();
                process.exit(0);
            }
            await new Promise(r => setTimeout(r, 2000));

        } catch (err) {
            // If you close the window, exit script
            if (err.message.includes('Session closed')) process.exit(0);
        }
    }
})();

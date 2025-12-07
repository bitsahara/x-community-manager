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

        console.log("🚀 Launching Browser to capture SearchTimeline request...\n");

        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
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
            }
        );

        // Intercept network requests
        await page.setRequestInterception(true);

        let capturedRequest = null;

        page.on('request', request => {
            const url = request.url();

            // Look for SearchTimeline GraphQL request
            if (url.includes('SearchTimeline')) {
                console.log('✅ Captured SearchTimeline request!\n');
                console.log('📍 URL:', url);
                console.log('\n🔑 Headers:');
                console.log(JSON.stringify(request.headers(), null, 2));

                capturedRequest = {
                    url: url,
                    headers: request.headers(),
                    method: request.method()
                };
            }

            request.continue();
        });

        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log("👉 Navigating to X search page...");
        await page.goto('https://x.com/search?q=%23BTC&src=typed_query&f=live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("\n⏳ Waiting for SearchTimeline request...");

        // Wait for the request to be captured
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (capturedRequest) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 30000);
        });

        if (capturedRequest) {
            console.log('\n💾 Saving captured request to captured_request.json');
            fs.writeFileSync(
                path.join(__dirname, 'captured_request.json'),
                JSON.stringify(capturedRequest, null, 2)
            );
            console.log('✅ Request saved!');
        } else {
            console.log('❌ No SearchTimeline request was captured');
        }

        console.log('\n⏳ Keeping browser open for 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));

        await browser.close();

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (xvfb) {
            console.log('🛑 Stopping virtual display...');
            xvfb.stopSync();
        }
        console.log('✅ Done!');
        process.exit(0);
    }
})();

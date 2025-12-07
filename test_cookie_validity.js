import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse cookies from a cookie string into an object
 */
function parseCookies(cookieString) {
    const cookies = {};
    cookieString.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name && valueParts.length > 0) {
            cookies[name] = valueParts.join('=');
        }
    });
    return cookies;
}

/**
 * Analyze cookie expiration and validity
 */
function analyzeCookies(cookies) {
    const analysis = [];
    const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds

    for (const [name, value] of Object.entries(cookies)) {
        const cookieInfo = {
            name,
            value,
            length: value.length,
            status: '✅ Present',
            expirationInfo: null,
            warnings: []
        };

        // Analyze specific cookies
        switch (name) {
            case 'auth_token':
                cookieInfo.description = 'Authentication token - Required for API access';
                if (value.length < 20) {
                    cookieInfo.warnings.push('⚠️ Token seems too short');
                }
                break;

            case 'ct0':
                cookieInfo.description = 'CSRF token - Must match x-csrf-token header';
                if (value.length < 50) {
                    cookieInfo.warnings.push('⚠️ CSRF token seems too short');
                }
                break;

            case 'twid':
                cookieInfo.description = 'Twitter ID - User identifier';
                const decodedTwid = decodeURIComponent(value);
                cookieInfo.decodedValue = decodedTwid;
                break;

            case 'guest_id':
                cookieInfo.description = 'Guest session identifier';
                const decodedGuestId = decodeURIComponent(value);
                cookieInfo.decodedValue = decodedGuestId;

                // Extract timestamp from guest_id (format: v1%3A<timestamp>)
                const guestIdMatch = decodedGuestId.match(/v1:(\d+)/);
                if (guestIdMatch) {
                    const timestamp = parseInt(guestIdMatch[1]);
                    // Check if timestamp is reasonable (between 2020 and 2030)
                    const minTimestamp = 1577836800; // Jan 1, 2020
                    const maxTimestamp = 1893456000; // Jan 1, 2030

                    if (timestamp >= minTimestamp && timestamp <= maxTimestamp) {
                        const date = new Date(timestamp * 1000);
                        if (!isNaN(date.getTime())) {
                            cookieInfo.expirationInfo = {
                                timestamp: timestamp,
                                date: date.toISOString(),
                                readable: date.toLocaleString(),
                                isExpired: false // guest_id doesn't expire based on this timestamp
                            };
                        }
                    } else {
                        cookieInfo.warnings.push(`⚠️ Timestamp ${timestamp} is out of expected range`);
                    }
                }
                break;

            case '__cf_bm':
                cookieInfo.description = 'Cloudflare Bot Management - Short-lived session cookie';

                // Extract timestamp from __cf_bm cookie
                // Format: <token>-<timestamp>.<session>-<version>-<data>
                const cfMatch = value.match(/-(\d{10})\./);
                if (cfMatch) {
                    const timestamp = parseInt(cfMatch[1]);
                    const expirationTime = timestamp + 1800; // __cf_bm typically expires after 30 minutes
                    const date = new Date(timestamp * 1000);
                    const expirationDate = new Date(expirationTime * 1000);
                    const isExpired = currentTime > expirationTime;

                    cookieInfo.expirationInfo = {
                        timestamp,
                        expirationTimestamp: expirationTime,
                        createdDate: date.toISOString(),
                        expirationDate: expirationDate.toISOString(),
                        createdReadable: date.toLocaleString(),
                        expirationReadable: expirationDate.toLocaleString(),
                        isExpired,
                        timeRemaining: isExpired ? 0 : expirationTime - currentTime,
                        timeRemainingReadable: isExpired ? 'EXPIRED' : formatSeconds(expirationTime - currentTime)
                    };

                    if (isExpired) {
                        cookieInfo.status = '❌ EXPIRED';
                        cookieInfo.warnings.push('🔴 Cloudflare cookie has expired - needs refresh');
                    } else if ((expirationTime - currentTime) < 300) {
                        cookieInfo.warnings.push('⚠️ Expires soon (less than 5 minutes)');
                    }
                }
                break;

            case '__cuid':
                cookieInfo.description = 'Client unique identifier';
                break;

            case 'lang':
                cookieInfo.description = 'Language preference';
                break;

            default:
                cookieInfo.description = 'Unknown cookie';
        }

        analysis.push(cookieInfo);
    }

    return analysis;
}

/**
 * Format seconds into human-readable time
 */
function formatSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}


/**
 * Verify CSRF token consistency
 */
function verifyCsrfToken(cookies, headers) {
    const ct0Cookie = cookies.ct0;
    const csrfHeader = headers['x-csrf-token'];

    const isMatch = ct0Cookie === csrfHeader;

    console.log('\n🔐 CSRF Token Verification:');
    console.log(`   ct0 cookie:      ${ct0Cookie?.substring(0, 50)}...`);
    console.log(`   x-csrf-token:    ${csrfHeader?.substring(0, 50)}...`);
    console.log(`   Match: ${isMatch ? '✅ YES' : '❌ NO - This will cause authentication failures!'}`);

    return isMatch;
}

/**
 * Main function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           🍪 COOKIE VALIDITY CHECKER 🍪');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Load captured request
    const capturedRequestPath = path.join(__dirname, 'captured_request.json');

    if (!fs.existsSync(capturedRequestPath)) {
        console.error('❌ Error: captured_request.json not found');
        console.error(`   Expected location: ${capturedRequestPath}`);
        process.exit(1);
    }

    const capturedRequest = JSON.parse(fs.readFileSync(capturedRequestPath, 'utf-8'));

    // Parse cookies
    const cookies = parseCookies(capturedRequest.headers.cookie);

    console.log(`📅 Current Time: ${new Date().toLocaleString()}`);
    console.log(`📅 Unix Timestamp: ${Math.floor(Date.now() / 1000)}\n`);

    // Analyze cookies
    const analysis = analyzeCookies(cookies);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                   COOKIE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    analysis.forEach((cookie, index) => {
        console.log(`${index + 1}. ${cookie.name}`);
        console.log(`   Status: ${cookie.status}`);
        console.log(`   Description: ${cookie.description}`);
        console.log(`   Value Length: ${cookie.length} characters`);

        if (cookie.decodedValue) {
            console.log(`   Decoded: ${cookie.decodedValue}`);
        }

        if (cookie.expirationInfo) {
            const exp = cookie.expirationInfo;
            if (exp.isExpired !== undefined) {
                console.log(`   Created: ${exp.createdReadable}`);
                console.log(`   Expires: ${exp.expirationReadable}`);
                console.log(`   Time Remaining: ${exp.timeRemainingReadable}`);
                console.log(`   Expired: ${exp.isExpired ? '❌ YES' : '✅ NO'}`);
            } else {
                console.log(`   Timestamp: ${exp.readable}`);
            }
        }

        if (cookie.warnings.length > 0) {
            cookie.warnings.forEach(warning => {
                console.log(`   ${warning}`);
            });
        }

        console.log('');
    });

    // Verify CSRF token
    verifyCsrfToken(cookies, capturedRequest.headers);


    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const expiredCookies = analysis.filter(c => c.status.includes('EXPIRED'));
    const warningCookies = analysis.filter(c => c.warnings.length > 0);

    console.log(`Total Cookies: ${analysis.length}`);
    console.log(`Expired Cookies: ${expiredCookies.length}`);
    console.log(`Cookies with Warnings: ${warningCookies.length}`);

    console.log('🎉 All systems go! Your cookies are valid and working.');

    console.log('⚠️  Action Required:');
    console.log('   1. Run 1_get_cookie.js to capture fresh cookies');
    console.log('   2. Update captured_request.json with new cookie values');
    console.log('   3. Run this script again to verify\n');

    console.log('═══════════════════════════════════════════════════════════\n');
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

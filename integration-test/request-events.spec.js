import { test, expect } from './helpers/playwrightHarness.js';
import backgroundWait from './helpers/backgroundWait';
import { logPageRequests } from './helpers/requests.js';

/**
 * Tests for request event tracking abstractions.
 * These tests verify that we can reliably detect request outcomes (allowed/blocked)
 * on both Chrome and Firefox using the unified logPageRequests abstraction.
 */
test.describe('request event tracking', () => {
    test('can track successful requests', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const requests = [];
        await logPageRequests(page, requests, undefined, undefined, undefined, { backgroundPage });

        // Navigate to a simple page that will make requests
        await page.goto('http://localhost:3000/');
        await page.waitForTimeout(1000);

        // We should have tracked at least one completed request (the page itself)
        expect(requests.length).toBeGreaterThan(0);

        // Find the main page request
        const mainFrameRequest = requests.find(
            (r) => r.url.href.includes('localhost:3000') && (r.type === 'document' || r.type === 'main_frame'),
        );
        expect(mainFrameRequest).toBeDefined();
        expect(mainFrameRequest.status).toBe('allowed');
    });

    test('can track third-party requests', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const requests = [];
        const requestFilter = (details) => details.url.href.includes('bad.third-party.site');
        await logPageRequests(page, requests, requestFilter, undefined, undefined, { backgroundPage });

        // Navigate to the request blocking test page
        const testUrl = 'http://localhost:3000/privacy-protections/request-blocking/';
        await page.goto(testUrl, { waitUntil: 'networkidle' });
        await page.click('#start');
        await page.waitForTimeout(3000);

        console.log('Requests to bad.third-party.site:', requests.length);

        // We should have tracked requests to the third-party site
        // Note: Whether these are blocked depends on extension config
        expect(requests.length).toBeGreaterThan(0);

        // Verify each request has the expected structure
        for (const request of requests) {
            expect(request.url.href).toContain('bad.third-party.site');
            expect(['allowed', 'blocked', 'failed']).toContain(request.status);
            expect(request.type).toBeDefined();
        }
    });

    test('request tracking reports correct request metadata', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const requests = [];
        await logPageRequests(page, requests, undefined, undefined, undefined, { backgroundPage });

        // Navigate to the request blocking test page
        const testUrl = 'http://localhost:3000/privacy-protections/request-blocking/';
        await page.goto(testUrl, { waitUntil: 'networkidle' });
        await page.click('#start');
        await page.waitForTimeout(3000);

        // We should have requests
        expect(requests.length).toBeGreaterThan(0);

        // Verify requests have correct structure and metadata
        const scriptRequest = requests.find((r) => r.type === 'script');
        if (scriptRequest) {
            expect(scriptRequest.method).toBe('GET');
            expect(scriptRequest.url.href).toContain('.js');
        }

        console.log(
            'Sample requests:',
            requests.slice(0, 5).map((r) => `${r.type}: ${r.status}`),
        );
    });

    test('can track surrogate requests', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const requests = [];
        const requestFilter = (details) => details.url.href.includes('googlesyndication.com');
        await logPageRequests(page, requests, requestFilter, undefined, undefined, { backgroundPage });

        // Create a page that loads a script that should be redirected to a surrogate
        // googlesyndication.com/pagead/show_ads.js is expected to be redirected to local noop.js
        await page.setContent(`
            <html>
            <head>
                <script src="https://pagead2.googlesyndication.com/pagead/show_ads.js"></script>
            </head>
            <body>Test page for surrogate redirect</body>
            </html>
        `);

        // Wait for the request to complete
        await page.waitForTimeout(2000);

        console.log(
            'Googlesyndication requests:',
            requests.map((r) => `${r.url.href}: ${r.status}`),
        );

        // We should have tracked the googlesyndication request
        expect(requests.length).toBeGreaterThan(0);

        // The surrogate request should be tracked as allowed (the surrogate loads successfully)
        const surrogateRequest = requests.find((r) => r.url.href.includes('show_ads.js'));
        expect(surrogateRequest).toBeDefined();
        expect(surrogateRequest.status).toBe('allowed');
    });
});

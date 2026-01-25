import { test, expect, isFirefox } from './helpers/playwrightHarness.js';
import backgroundWait from './helpers/backgroundWait';
import {
    setupFirefoxRequestTracking,
    clearFirefoxTrackedRequests,
    getFirefoxTrackedRequests,
    getFirefoxRequestTrackingStats,
} from './helpers/firefoxHarness.js';

/**
 * Tests for request event tracking abstractions.
 * These tests verify that we can reliably detect request outcomes (allowed/blocked)
 * on both Chrome and Firefox.
 */
test.describe('request event tracking', () => {
    test('can track successful requests', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        if (isFirefox()) {
            // Firefox: Use webRequest API via background eval
            await setupFirefoxRequestTracking(backgroundPage, true); // Enable debug logging
            await clearFirefoxTrackedRequests(backgroundPage);

            // Navigate to a simple page that will make requests
            await page.goto('http://localhost:3000/');

            // Give time for requests to be tracked
            await page.waitForTimeout(1000);

            const outcomes = await getFirefoxTrackedRequests(backgroundPage);
            const stats = await getFirefoxRequestTrackingStats(backgroundPage);

            console.log('Completed outcomes:', outcomes.length);
            console.log('Stats:', stats);

            // We should have tracked at least one completed request (the page itself)
            expect(outcomes.length).toBeGreaterThan(0);

            // Find the main page request
            const mainFrameOutcome = outcomes.find((o) => o.url.includes('localhost:3000') && o.resourceType === 'main_frame');
            expect(mainFrameOutcome).toBeDefined();
            expect(mainFrameOutcome.status).toBe('allowed');
        } else {
            // Chrome: Use Playwright's native request events
            const requests = [];
            const responses = [];

            page.on('request', (req) => {
                requests.push({
                    url: req.url(),
                    resourceType: req.resourceType(),
                });
            });

            page.on('requestfinished', (req) => {
                responses.push({
                    url: req.url(),
                    status: 'finished',
                });
            });

            await page.goto('http://localhost:3000/');
            await page.waitForTimeout(500);

            expect(requests.length).toBeGreaterThan(0);
            expect(responses.length).toBeGreaterThan(0);

            // Find the main page request
            const mainFrameRequest = requests.find((r) => r.url.includes('localhost:3000') && r.resourceType === 'document');
            expect(mainFrameRequest).toBeDefined();

            const mainFrameResponse = responses.find((r) => r.url === mainFrameRequest.url);
            expect(mainFrameResponse).toBeDefined();
        }
    });

    test('can track third-party requests', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        // Navigate to the request blocking test page
        const testUrl = 'http://localhost:3000/privacy-protections/request-blocking/';

        if (isFirefox()) {
            // Firefox: Use webRequest API via background eval
            await setupFirefoxRequestTracking(backgroundPage, true); // Enable debug logging
            await clearFirefoxTrackedRequests(backgroundPage);

            await page.goto(testUrl, { waitUntil: 'networkidle' });

            // Click the start button to trigger test requests
            await page.click('#start');

            // Wait for requests to be made and tracked
            await page.waitForTimeout(3000);

            const outcomes = await getFirefoxTrackedRequests(backgroundPage);
            console.log('Total outcomes tracked:', outcomes.length);

            // Find requests to bad.third-party.site
            const badPartyOutcomes = outcomes.filter((o) => o.url.includes('bad.third-party.site'));
            console.log('Total bad.third-party.site outcomes:', badPartyOutcomes.length);

            // We should have tracked requests to the third-party site
            // Note: Whether these are blocked depends on extension config (problem #2)
            expect(badPartyOutcomes.length).toBeGreaterThan(0);

            // Verify each outcome has the expected structure
            for (const outcome of badPartyOutcomes) {
                expect(outcome.url).toContain('bad.third-party.site');
                expect(['allowed', 'blocked', 'failed', 'redirected']).toContain(outcome.status);
                expect(outcome.resourceType).toBeDefined();
            }
        } else {
            // Chrome: Use Playwright's native request events
            const allRequests = [];

            page.on('request', (req) => {
                if (req.url().includes('bad.third-party.site')) {
                    allRequests.push({ url: req.url() });
                }
            });

            page.on('requestfinished', (req) => {
                const existing = allRequests.find((r) => r.url === req.url());
                if (existing) existing.status = 'finished';
            });

            page.on('requestfailed', (req) => {
                const existing = allRequests.find((r) => r.url === req.url());
                if (existing) existing.status = 'failed';
            });

            await page.goto(testUrl, { waitUntil: 'networkidle' });
            await page.click('#start');

            // Wait for requests to be made
            await page.waitForTimeout(3000);

            console.log('Requests to bad.third-party.site:', allRequests.length);

            // We should have tracked requests
            expect(allRequests.length).toBeGreaterThan(0);
        }
    });

    test('request tracking reports correct request metadata', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        // Navigate to the request blocking test page
        const testUrl = 'http://localhost:3000/privacy-protections/request-blocking/';

        if (isFirefox()) {
            await setupFirefoxRequestTracking(backgroundPage, true);
            await clearFirefoxTrackedRequests(backgroundPage);

            await page.goto(testUrl, { waitUntil: 'networkidle' });
            await page.click('#start');
            await page.waitForTimeout(3000);

            const outcomes = await getFirefoxTrackedRequests(backgroundPage);

            // We should have outcomes
            expect(outcomes.length).toBeGreaterThan(0);

            // Verify outcomes have correct structure and metadata
            const scriptOutcome = outcomes.find((o) => o.resourceType === 'script');
            if (scriptOutcome) {
                expect(scriptOutcome.method).toBe('GET');
                expect(scriptOutcome.url).toContain('.js');
            }

            const xhrOutcome = outcomes.find((o) => o.resourceType === 'xmlhttprequest');
            if (xhrOutcome) {
                expect(xhrOutcome.method).toBeDefined();
            }

            console.log(
                'Sample outcomes:',
                outcomes.slice(0, 5).map((o) => `${o.resourceType}: ${o.status}`),
            );
        } else {
            let requestCount = 0;

            page.on('requestfinished', () => {
                requestCount++;
            });

            page.on('requestfailed', () => {
                requestCount++;
            });

            await page.goto(testUrl, { waitUntil: 'networkidle' });
            await page.click('#start');
            await page.waitForTimeout(3000);

            console.log('Total request outcomes:', requestCount);

            // We should have tracked request outcomes
            expect(requestCount).toBeGreaterThan(0);
        }
    });
});

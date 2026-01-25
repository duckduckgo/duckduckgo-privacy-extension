import { test, expect, isFirefox } from './helpers/playwrightHarness.js';
import backgroundWait from './helpers/backgroundWait';
import { setupFirefoxRequestTracking, clearFirefoxTrackedRequests, getFirefoxTrackedRequests } from './helpers/firefoxHarness.js';

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

            const events = await getFirefoxTrackedRequests(backgroundPage);

            // We should have tracked at least one request (the page itself)
            const startedEvents = events.filter((e) => e.type === 'started');
            const completedEvents = events.filter((e) => e.type === 'completed');

            console.log('Started events:', startedEvents.length);
            console.log('Completed events:', completedEvents.length);

            expect(startedEvents.length).toBeGreaterThan(0);
            expect(completedEvents.length).toBeGreaterThan(0);

            // Find the main page request
            const mainFrameRequest = startedEvents.find((e) => e.url.includes('localhost:3000') && e.resourceType === 'main_frame');
            expect(mainFrameRequest).toBeDefined();

            // Verify the main frame request completed
            const mainFrameCompleted = completedEvents.find((e) => e.requestId === mainFrameRequest.requestId);
            expect(mainFrameCompleted).toBeDefined();
            expect(mainFrameCompleted.statusCode).toBe(200);
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

    test('can track blocked requests', async ({ context, backgroundPage, page }) => {
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

            const events = await getFirefoxTrackedRequests(backgroundPage);
            console.log('Total events tracked:', events.length);

            // Find requests to bad.third-party.site (which should be blocked)
            const blockedRequests = events.filter((e) => e.type === 'error' && e.url.includes('bad.third-party.site'));

            const startedBadRequests = events.filter((e) => e.type === 'started' && e.url.includes('bad.third-party.site'));

            console.log('Started bad.third-party.site requests:', startedBadRequests.length);
            console.log('Error events for bad.third-party.site:', blockedRequests.length);

            // We should have at least some blocked requests
            expect(startedBadRequests.length).toBeGreaterThan(0);

            // Verify that error events were fired for blocked requests
            // Note: The exact number may vary, but we should see error events
            if (blockedRequests.length === 0) {
                // Log all events for debugging
                console.log('All events:', JSON.stringify(events, null, 2));
            }
            expect(blockedRequests.length).toBeGreaterThan(0);

            // Check the error type
            const firstBlockedRequest = blockedRequests[0];
            console.log('First blocked request error:', firstBlockedRequest.error);

            // Firefox typically uses NS_ERROR_ABORT for blocked requests
            expect(firstBlockedRequest.error).toBeDefined();
        } else {
            // Chrome: Use Playwright's native request events
            const failedRequests = [];

            page.on('requestfailed', (req) => {
                if (req.url().includes('bad.third-party.site')) {
                    failedRequests.push({
                        url: req.url(),
                        error: req.failure()?.errorText,
                    });
                }
            });

            await page.goto(testUrl, { waitUntil: 'networkidle' });
            await page.click('#start');

            // Wait for requests to be made
            await page.waitForTimeout(3000);

            console.log('Failed requests to bad.third-party.site:', failedRequests.length);

            // We should have blocked requests
            expect(failedRequests.length).toBeGreaterThan(0);

            // Check the error type
            const firstFailedRequest = failedRequests[0];
            console.log('First failed request error:', firstFailedRequest.error);
            expect(firstFailedRequest.error).toBeDefined();
        }
    });

    test('request tracking distinguishes between blocked and completed requests', async ({ context, backgroundPage, page }) => {
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

            const events = await getFirefoxTrackedRequests(backgroundPage);

            // Group by requestId to match started with outcomes
            const requestsById = new Map();
            for (const event of events) {
                if (!requestsById.has(event.requestId)) {
                    requestsById.set(event.requestId, { started: null, outcome: null });
                }
                const req = requestsById.get(event.requestId);
                if (event.type === 'started') {
                    req.started = event;
                } else {
                    req.outcome = event;
                }
            }

            // Find completed requests (should include page resources)
            let completedCount = 0;
            let blockedCount = 0;

            for (const [, req] of requestsById) {
                if (!req.outcome) continue;

                if (req.outcome.type === 'completed') {
                    completedCount++;
                } else if (req.outcome.type === 'error') {
                    blockedCount++;
                }
            }

            console.log('Completed requests:', completedCount);
            console.log('Blocked/errored requests:', blockedCount);

            // We should have both completed and blocked requests
            expect(completedCount).toBeGreaterThan(0);
            expect(blockedCount).toBeGreaterThan(0);
        } else {
            let completedCount = 0;
            let failedCount = 0;

            page.on('requestfinished', () => {
                completedCount++;
            });

            page.on('requestfailed', () => {
                failedCount++;
            });

            await page.goto(testUrl, { waitUntil: 'networkidle' });
            await page.click('#start');
            await page.waitForTimeout(3000);

            console.log('Completed requests:', completedCount);
            console.log('Failed requests:', failedCount);

            // We should have both completed and blocked requests
            expect(completedCount).toBeGreaterThan(0);
            expect(failedCount).toBeGreaterThan(0);
        }
    });
});

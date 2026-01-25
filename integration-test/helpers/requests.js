import { isFirefox } from './playwrightHarness.js';
import { setupFirefoxRequestTracking, clearFirefoxTrackedRequests, waitForFirefoxRequestOutcomes } from './firefoxHarness.js';

/**
 * @typedef {object} LoggedRequestDetails
 * @property {URL} url
 *   The request's URL.
 * @property {boolean} [blocked]
 *   False if the request was successful, true if it was blocked or failed.
 * @property {string} [method]
 * @property {string} type
 * @property {string} [reason]
 * @property {'redirected' | 'allowed' | 'blocked' | 'failed'} [status]
 * @property {URL} [redirectUrl]
 * @property {string} [initiator]
 */

/**
 * Start logging requests for the given Page.
 * @param {import('@playwright/test').Page} page
 *   The Playwright page to log requests for.
 * @param {LoggedRequestDetails[]} requests
 *   Array of request details, appended to as requests happen.
 *   Note: The requests array is mutated by this function.
 * @param {function} [requestFilter]
 *   Optional filter function that (if given) should return falsey for requests
 *   that should be ignored.
 * @param {function} [transform]
 *   Optional function to transform each request before adding them to the
 *   requests array.
 * @param {function} [postTransformFilter]
 *   Optional second filter function that returns false for transformed requests
 *   that should be ignored.
 * @returns {Promise<function>}
 *   Function that clears logged requests (and in progress requests).
 */
export async function logPageRequests(page, requests, requestFilter, transform, postTransformFilter) {
    /** @type {Map<number, LoggedRequestDetails>} */
    const requestDetailsByRequestId = new Map();

    /**
     * @param {number} requestId
     * @param {(details: LoggedRequestDetails) => void} updateDetails
     * @returns {void}
     */
    const saveRequestOutcome = (requestId, updateDetails) => {
        if (!requestDetailsByRequestId.has(requestId)) {
            return;
        }

        const details = requestDetailsByRequestId.get(requestId);
        requestDetailsByRequestId.delete(requestId);
        if (!details) {
            return;
        }

        updateDetails(details);

        if (!requestFilter || requestFilter(details)) {
            if (transform) {
                const transformedDetails = transform(details);
                if (!postTransformFilter || postTransformFilter(transformedDetails)) {
                    requests.push(transformedDetails);
                }
            } else {
                requests.push(details);
            }
        }
    };

    logRequestsPlaywright(page, requestDetailsByRequestId, saveRequestOutcome);

    return () => {
        requests.length = 0;
        requestDetailsByRequestId.clear();
    };
}

function logRequestsPlaywright(page, requestDetailsByRequestId, saveRequestOutcome) {
    page.on('request', (request) => {
        const url = request.url();
        const requestDetails = {
            url,
            method: request.method(),
            type: request.resourceType(),
        };
        if (request.redirectedFrom()) {
            requestDetails.redirectUrl = request.url();
        }
        requestDetails.url = new URL(requestDetails.url);
        requestDetailsByRequestId.set(url, requestDetails);
    });
    page.on('requestfinished', (request) => {
        saveRequestOutcome(request.url(), (details) => {
            details.status = details.redirectUrl ? 'redirected' : 'allowed';
        });
    });
    page.on('requestfailed', (request) => {
        saveRequestOutcome(request.url(), (details) => {
            const { errorText } = request.failure();
            if (errorText === 'net::ERR_BLOCKED_BY_CLIENT' || errorText === 'net::ERR_ABORTED') {
                details.status = 'blocked';
                details.reason = errorText;
            } else {
                details.status = 'failed';
                details.reason = errorText;
            }
        });
    });
}

/**
 * Load the Request Blocking privacy test page, run the tests and return the
 * results.
 * See https://privacy-test-pages.site/privacy-protections/request-blocking/
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 *   URL of the test page.
 * @param {object} [options]
 * @param {import('./firefoxHarness.js').FirefoxBackgroundPage | import('@playwright/test').Worker} [options.backgroundPage]
 *   Background page for Firefox request tracking (required for Firefox).
 * @param {boolean} [options.debug=false]
 *   Enable debug logging for request tracking.
 * @returns {Promise<{ testCount: number, pageRequests: Object[], pageResults: Object[] }>}
 */
export async function runRequestBlockingTest(page, url, options = {}) {
    const { backgroundPage, debug = false } = options;

    if (isFirefox()) {
        return runRequestBlockingTestFirefox(page, url, backgroundPage, debug);
    } else {
        return runRequestBlockingTestChrome(page, url);
    }
}

/**
 * Chrome/Chromium implementation of request blocking test.
 * Uses Playwright's native request/response events.
 */
async function runRequestBlockingTestChrome(page, url) {
    const pageRequests = [];
    page.on('request', async (req) => {
        if (!req.url().startsWith('https://bad.third-party.site/')) {
            return;
        }
        let status = 'unknown';
        const resp = await req.response();
        if (!resp) {
            status = 'blocked';
        } else {
            status = resp.ok() ? 'allowed' : 'redirected';
        }
        pageRequests.push({
            url: req.url(),
            method: req.method(),
            type: req.resourceType(),
            status,
        });
    });

    await page.bringToFront();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#start');
    const testCount = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => tests.filter(({ id }) => !id.includes('worker')).length,
    );
    while (pageRequests.length < testCount) {
        await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);

    const pageResults = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => results.results,
    );

    return { testCount, pageRequests, pageResults };
}

/**
 * Firefox implementation of request blocking test.
 * Uses webRequest API via background page evaluation to track request outcomes,
 * as Playwright's requestfinished/requestfailed events don't fire reliably on Firefox.
 */
async function runRequestBlockingTestFirefox(page, url, backgroundPage, debug = false) {
    if (!backgroundPage) {
        throw new Error('backgroundPage is required for Firefox request blocking tests');
    }

    // Set up request tracking in the extension background
    await setupFirefoxRequestTracking(backgroundPage, debug);
    await clearFirefoxTrackedRequests(backgroundPage);

    await page.bringToFront();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#start');

    const testCount = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => tests.filter(({ id }) => !id.includes('worker')).length,
    );

    if (debug) {
        console.log(`[runRequestBlockingTestFirefox] Expecting ${testCount} test requests`);
    }

    // Wait for request outcomes using the Firefox-specific tracking
    const urlFilter = (requestUrl) => requestUrl.startsWith('https://bad.third-party.site/');

    const requestOutcomes = await waitForFirefoxRequestOutcomes(backgroundPage, {
        urlFilter,
        expectedCount: testCount,
        timeout: 30000,
        pollInterval: 100,
        debug,
    });

    // Map to the expected format
    const pageRequests = requestOutcomes.map((outcome) => ({
        url: outcome.url,
        method: outcome.method,
        type: outcome.resourceType,
        status: outcome.status,
    }));

    // Wait a bit for the page to update results
    await page.waitForTimeout(1000);

    const pageResults = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => results.results,
    );

    return { testCount, pageRequests, pageResults };
}

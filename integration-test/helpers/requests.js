import { isFirefox } from './playwrightHarness.js';
import { setupFirefoxRequestTracking, clearFirefoxTrackedRequests, popFirefoxRequestOutcome } from './firefoxHarness.js';

/**
 * @typedef {object} LoggedRequestDetails
 * @property {URL} url
 *   The request's URL.
 * @property {boolean} [blocked]
 *   False if the request was successful, true if it was blocked or failed.
 * @property {string} [method]
 * @property {string} type
 * @property {string} [reason]
 * @property {'allowed' | 'blocked' | 'failed' | 'redirected'} [status]
 * @property {URL} [redirectUrl]
 * @property {string} [initiator]
 */

/**
 * Start logging requests for the given Page.
 * Works on both Chrome and Firefox by dispatching to browser-specific implementations.
 *
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
 * @param {object} [options]
 *   Additional options.
 * @param {import('./firefoxHarness.js').FirefoxBackgroundPage | import('@playwright/test').Worker} [options.backgroundPage]
 *   Background page for Firefox request tracking (required for Firefox).
 * @returns {Promise<function>}
 *   Function that clears logged requests (and in progress requests).
 */
export async function logPageRequests(page, requests, requestFilter, transform, postTransformFilter, options = {}) {
    /** @type {Map<string, LoggedRequestDetails>} */
    const requestDetailsByRequestId = new Map();

    /**
     * @param {string} requestId
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

    if (isFirefox()) {
        await logRequestsPlaywrightFirefox(page, requestDetailsByRequestId, saveRequestOutcome, options.backgroundPage);
    } else {
        logRequestsPlaywrightChrome(page, requestDetailsByRequestId, saveRequestOutcome);
    }

    return () => {
        requests.length = 0;
        requestDetailsByRequestId.clear();
    };
}

/**
 * Chrome implementation: Uses Playwright's native request events.
 */
function logRequestsPlaywrightChrome(page, requestDetailsByRequestId, saveRequestOutcome) {
    page.on('request', (request) => {
        const url = request.url();
        const redirectedFrom = request.redirectedFrom();
        const requestDetails = {
            url,
            method: request.method(),
            type: request.resourceType(),
        };

        // Check if this request was redirected from another URL
        if (redirectedFrom) {
            const originalUrl = redirectedFrom.url();
            // Mark the original request as "redirected"
            saveRequestOutcome(originalUrl, (details) => {
                details.status = 'redirected';
                details.redirectUrl = new URL(url);
            });
            requestDetails.redirectUrl = new URL(url);
        }

        requestDetails.url = new URL(requestDetails.url);
        requestDetailsByRequestId.set(url, requestDetails);
    });
    page.on('requestfinished', (request) => {
        saveRequestOutcome(request.url(), (details) => {
            // Successful requests are "allowed"
            details.status = 'allowed';
        });
    });
    page.on('requestfailed', (request) => {
        saveRequestOutcome(request.url(), (details) => {
            const failure = request.failure();
            const errorText = failure ? failure.errorText : '';
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
 * Firefox implementation: Uses webRequest API via background page evaluation.
 * Playwright's requestfinished/requestfailed events don't fire reliably on Firefox,
 * so we use the extension's webRequest API to track request outcomes.
 *
 * For Firefox, we still use page.on('request') to capture initial request details,
 * and then poll the background for outcomes. When an outcome arrives, we match it
 * to the pending request by URL and call saveRequestOutcome.
 */
async function logRequestsPlaywrightFirefox(page, requestDetailsByRequestId, saveRequestOutcome, backgroundPage) {
    if (!backgroundPage) {
        throw new Error('backgroundPage is required for Firefox request logging');
    }

    // Set up request tracking in the extension background
    await setupFirefoxRequestTracking(backgroundPage, false);
    await clearFirefoxTrackedRequests(backgroundPage);

    // Track requests via page.on('request') to capture initial details
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

    // Store state for async polling
    let isPolling = true;

    // Poll for outcomes from the Firefox background
    const pollForOutcomes = async () => {
        while (isPolling) {
            try {
                const outcome = await popFirefoxRequestOutcome(backgroundPage);
                if (outcome) {
                    // Match outcome to pending request and save
                    if (requestDetailsByRequestId.has(outcome.url)) {
                        saveRequestOutcome(outcome.url, (details) => {
                            details.status = outcome.status;
                            if (outcome.method) {
                                details.method = outcome.method;
                            }
                        });
                    } else {
                        // Request was made by extension/not captured by page.on('request')
                        // Create a new entry for it
                        const details = {
                            url: new URL(outcome.url),
                            method: outcome.method || 'GET',
                            type: outcome.resourceType,
                            status: outcome.status,
                        };
                        requestDetailsByRequestId.set(outcome.url, details);
                        saveRequestOutcome(outcome.url, () => {});
                    }
                }
            } catch (e) {
                // Background page might be closed, stop polling
                isPolling = false;
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    };

    // Start polling in the background (don't await)
    pollForOutcomes().catch(() => {
        isPolling = false;
    });

    // Store stop function for cleanup (attached to page for access)
    // @ts-ignore
    page._firefoxPollingStop = () => {
        isPolling = false;
    };
}

/**
 * Load the Request Blocking privacy test page, run the tests and return the
 * results.
 * See https://privacy-test-pages.site/privacy-protections/request-blocking/
 *
 * Uses logPageRequests abstraction which handles browser differences internally.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 *   URL of the test page.
 * @param {object} [options]
 * @param {import('./firefoxHarness.js').FirefoxBackgroundPage | import('@playwright/test').Worker} [options.backgroundPage]
 *   Background page for Firefox request tracking (required for Firefox).
 * @returns {Promise<{ testCount: number, pageRequests: Object[], pageResults: Object[] }>}
 */
export async function runRequestBlockingTest(page, url, options = {}) {
    const { backgroundPage } = options;

    const pageRequests = [];
    const requestFilter = (details) => details.url.href.startsWith('https://bad.third-party.site/');
    const transform = (details) => ({
        url: details.url.href,
        method: details.method,
        type: details.type,
        status: details.status,
    });

    await logPageRequests(page, pageRequests, requestFilter, transform, undefined, { backgroundPage });

    await page.bringToFront();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#start');

    const testCount = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => tests.filter(({ id }) => !id.includes('worker')).length,
    );

    // Wait for all expected requests to be logged
    const startTime = Date.now();
    const timeout = 30000;
    while (pageRequests.length < testCount && Date.now() - startTime < timeout) {
        await page.waitForTimeout(100);
    }

    await page.waitForTimeout(1000);

    const pageResults = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => results.results,
    );

    // Stop Firefox polling if active
    // @ts-ignore
    if (page._firefoxPollingStop) {
        // @ts-ignore
        page._firefoxPollingStop();
    }

    return { testCount, pageRequests, pageResults };
}

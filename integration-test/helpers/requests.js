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
 * @property {'redirected' | 'allowed' | 'blocked' | 'failed'} [status]
 * @property {URL} [redirectUrl]
 *   If this request was redirected, the URL it was redirected to.
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
        await logRequestsPlaywrightChrome(page, requestDetailsByRequestId, saveRequestOutcome, options.backgroundPage);
    }

    return () => {
        requests.length = 0;
        requestDetailsByRequestId.clear();
    };
}

/**
 * Check if a URL matches a surrogate rule in the TDS (runs in extension background).
 * @param {string} url
 * @returns {boolean}
 */
function checkSurrogateRuleCode(url) {
    try {
        // Only check HTTPS URLs
        if (!url.startsWith('https://')) {
            return false;
        }
        // Check tracker rules for surrogate actions
        if (globalThis.dbg && globalThis.dbg.tds && globalThis.dbg.tds.tds) {
            const tds = globalThis.dbg.tds.tds;
            if (tds.trackers) {
                for (const tracker of Object.values(tds.trackers)) {
                    // @ts-ignore - tracker is dynamic
                    if (tracker.rules) {
                        // @ts-ignore - tracker is dynamic
                        for (const rule of tracker.rules) {
                            try {
                                if (rule.surrogate && url.match(new RegExp(rule.rule))) {
                                    return true;
                                }
                            } catch (e) {
                                // Invalid regex, skip
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return false;
}

/**
 * Chrome implementation: Uses Playwright's native request events.
 * @param {import('@playwright/test').Page} page
 * @param {Map<string, LoggedRequestDetails>} requestDetailsByRequestId
 * @param {(requestId: string, updateDetails: (details: LoggedRequestDetails) => void) => void} saveRequestOutcome
 * @param {import('./firefoxHarness.js').FirefoxBackgroundPage | import('@playwright/test').Worker} [backgroundPage]
 */
async function logRequestsPlaywrightChrome(page, requestDetailsByRequestId, saveRequestOutcome, backgroundPage) {
    // Track URLs that need surrogate checking after request finishes
    /** @type {Set<string>} */
    const pendingFinishedRequests = new Set();

    page.on('request', (request) => {
        const url = request.url();
        /** @type {LoggedRequestDetails} */
        const requestDetails = {
            url: new URL(url),
            method: request.method(),
            type: request.resourceType(),
        };
        // Check if this request is a redirect from another request
        if (request.redirectedFrom()) {
            requestDetails.redirectUrl = new URL(request.url());
        }
        requestDetailsByRequestId.set(url, requestDetails);
    });
    page.on('requestfinished', async (request) => {
        const url = request.url();
        const details = requestDetailsByRequestId.get(url);

        // If already detected as redirect via redirectedFrom(), use that
        if (details && details.redirectUrl) {
            saveRequestOutcome(url, (d) => {
                d.status = 'redirected';
            });
            return;
        }

        // If we have a backgroundPage, check if this URL matches a surrogate rule
        if (backgroundPage && url.startsWith('https://')) {
            pendingFinishedRequests.add(url);
            try {
                const isSurrogate = await backgroundPage.evaluate(checkSurrogateRuleCode, url);
                if (isSurrogate && pendingFinishedRequests.has(url)) {
                    pendingFinishedRequests.delete(url);
                    saveRequestOutcome(url, (d) => {
                        d.status = 'redirected';
                    });
                    return;
                }
            } catch (e) {
                // Ignore errors checking surrogate rules
            }
            pendingFinishedRequests.delete(url);
        }

        saveRequestOutcome(url, (d) => {
            d.status = 'allowed';
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
 */
async function logRequestsPlaywrightFirefox(page, requestDetailsByRequestId, saveRequestOutcome, backgroundPage) {
    if (!backgroundPage) {
        throw new Error('backgroundPage is required for Firefox request logging');
    }

    // Set up request tracking in the extension background (debug enabled to diagnose)
    await setupFirefoxRequestTracking(backgroundPage, true);
    await clearFirefoxTrackedRequests(backgroundPage);

    // Track requests via page.on('request') to capture initial details
    page.on('request', (request) => {
        const url = request.url();
        requestDetailsByRequestId.set(url, {
            url: new URL(url),
            method: request.method(),
            type: request.resourceType(),
        });
    });

    // Poll for outcomes from the Firefox background
    let isPolling = true;
    const pollForOutcomes = async () => {
        while (isPolling) {
            try {
                const outcome = await popFirefoxRequestOutcome(backgroundPage);
                if (outcome && requestDetailsByRequestId.has(outcome.url)) {
                    saveRequestOutcome(outcome.url, (details) => {
                        details.status = outcome.status;
                    });
                }
            } catch {
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

    // @ts-ignore - Store stop function for cleanup
    page._firefoxPollingStop = () => {
        isPolling = false;
    };
}

/**
 * Load the Request Blocking privacy test page, run the tests and return the
 * results.
 * See https://privacy-test-pages.site/privacy-protections/request-blocking/
 *
 * For Chrome: Uses the original approach with req.response() for accurate status detection.
 * For Firefox: Uses webRequest API via background page for reliable event detection.
 *
 * @param {import('./firefoxHarness.js').FirefoxBackgroundPage | import('@playwright/test').Worker} backgroundPage
 *   Background page for request tracking.
 * @param {import('@playwright/test').Page} page
 * @param {string} testSite
 *   URL of the test page.
 * @returns {Promise<{ testCount: number, pageRequests: Object[], pageResults: Object[] }>}
 */
export async function runRequestBlockingTest(backgroundPage, page, testSite) {
    const pageRequests = [];

    if (isFirefox()) {
        // Firefox: Use logPageRequests abstraction with webRequest tracking
        const requestFilter = (details) => details.url.href.startsWith('https://bad.third-party.site/');
        const transform = (details) => ({
            url: details.url.href,
            method: details.method,
            type: details.type,
            status: details.status,
        });

        await logPageRequests(page, pageRequests, requestFilter, transform, undefined, { backgroundPage });
    } else {
        // Chrome: Use original approach with req.response() for accurate status
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
    }

    await page.bringToFront();
    await page.goto(testSite, { waitUntil: 'networkidle' });
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

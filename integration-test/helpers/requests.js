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
        const failure = request.failure();
        const errorText = failure?.errorText || '';
        saveRequestOutcome(request.url(), (details) => {
            if (
                // Chrome
                errorText === 'net::ERR_BLOCKED_BY_CLIENT' ||
                errorText === 'net::ERR_ABORTED' ||
                // Firefox
                errorText.includes('NS_ERROR_ABORT') ||
                errorText.includes('NS_BINDING_ABORTED') ||
                errorText === 'Request was canceled' ||
                errorText === ''
            ) {
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
 * @returns {Promise<{ testCount: number, pageRequests: Object[], pageResults: Object[] }>}
 */
export async function runRequestBlockingTest(page, url) {
    const pageRequests = [];
    const pendingRequests = new Map();

    page.on('request', (req) => {
        const reqUrl = req.url();
        if (!reqUrl.startsWith('https://bad.third-party.site/')) {
            return;
        }
        pendingRequests.set(reqUrl, {
            url: reqUrl,
            method: req.method(),
            type: req.resourceType(),
            status: 'pending',
        });
    });

    page.on('requestfinished', (req) => {
        const reqUrl = req.url();
        if (!pendingRequests.has(reqUrl)) {
            return;
        }
        const details = pendingRequests.get(reqUrl);
        pendingRequests.delete(reqUrl);
        details.status = 'allowed';
        pageRequests.push(details);
    });

    page.on('requestfailed', (req) => {
        const reqUrl = req.url();
        if (!pendingRequests.has(reqUrl)) {
            return;
        }
        const failure = req.failure();
        const details = pendingRequests.get(reqUrl);
        pendingRequests.delete(reqUrl);
        const errorText = failure?.errorText || '';
        if (
            // Chrome
            errorText === 'net::ERR_BLOCKED_BY_CLIENT' ||
            errorText === 'net::ERR_ABORTED' ||
            // Firefox
            errorText.includes('NS_ERROR_ABORT') ||
            errorText.includes('NS_BINDING_ABORTED') ||
            errorText === 'Request was canceled' ||
            errorText === ''
        ) {
            details.status = 'blocked';
        } else {
            details.status = 'failed';
        }
        details.reason = errorText;
        pageRequests.push(details);
    });

    await page.bringToFront();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#start');
    const testCount = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => tests.filter(({ id }) => !id.includes('worker')).length,
    );

    // Wait for requests with timeout
    const maxWait = 30000;
    const startTime = Date.now();
    while (pageRequests.length < testCount && Date.now() - startTime < maxWait) {
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

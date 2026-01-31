/**
 * @typedef {object} LoggedRequestDetails
 * @property {URL} url
 *   The request's URL.
 * @property {string} [method]
 * @property {string} type
 * @property {string} [reason]
 * @property {'redirected' | 'allowed' | 'blocked' | 'failed'} [status]
 */

/**
 * Start logging requests for the given Page.
 * @param {object} _backgroundPage
 *   Background page, reserved for future Firefox request tracking.
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
 *   Function that removes the event listeners (call when done logging).
 */
export async function logPageRequests(_backgroundPage, page, requests, requestFilter, transform, postTransformFilter) {
    const processRequest = (url, method, resourceType, status, reason) => {
        const details = {
            url: new URL(url),
            method,
            type: resourceType,
            status,
            reason,
        };

        if (requestFilter && !requestFilter(details)) {
            return;
        }

        const transformed = transform ? transform(details) : details;
        if (!postTransformFilter || postTransformFilter(transformed)) {
            requests.push(transformed);
        }
    };

    const onRequestFinished = (request) => {
        const status = request.redirectedTo() ? 'redirected' : 'allowed';
        processRequest(request.url(), request.method(), request.resourceType(), status);
    };

    const onRequestFailed = (request) => {
        let url = request.url();
        const failure = request.failure();
        const errorText = failure?.errorText || 'unknown';
        const status = errorText === 'net::ERR_BLOCKED_BY_CLIENT' || errorText === 'net::ERR_ABORTED' ? 'blocked' : 'failed';

        // Workaround for race condition: when a request redirects to a blocked URL,
        // sometimes the original request is reported as blocked before the redirect
        // completes. In this case, extract the destination URL from the redirect
        // request and report that as blocked instead.
        if (status === 'blocked') {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'privacy-test-pages.site' && urlObj.pathname === '/redirect') {
                const destination = urlObj.searchParams.get('destination');
                if (destination) {
                    url = destination;
                }
            }
        }

        processRequest(url, request.method(), request.resourceType(), status, errorText);
    };

    page.on('requestfinished', onRequestFinished);
    page.on('requestfailed', onRequestFailed);

    return () => {
        page.off('requestfinished', onRequestFinished);
        page.off('requestfailed', onRequestFailed);
    };
}

/**
 * Load the Request Blocking privacy test page, run the tests and return the
 * results.
 * See https://privacy-test-pages.site/privacy-protections/request-blocking/
 *
 * @param {object} backgroundPage
 *   Background page for Firefox request tracking.
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 *   URL of the test page.
 * @returns {Promise<{ testCount: number, pageRequests: Object[], pageResults: Object[] }>}
 */
export async function runRequestBlockingTest(backgroundPage, page, url) {
    const pageRequests = [];

    const cleanup = await logPageRequests(backgroundPage, page, pageRequests, (r) => r.url.hostname === 'bad.third-party.site');

    await page.bringToFront();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.click('#start');

    const { testCount, flakeyTestCount } = await page.evaluate(() => {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        const allTests = tests;
        // Playwright's request events appear to fire unreliably for these ones.
        const flakeyTests = allTests.filter(({ id }) => id.includes('worker') || id === 'websocket');

        return {
            testCount: allTests.length,
            flakeyTestCount: flakeyTests.length,
        };
    });

    // Wait for up to 15 seconds for all the requests to be made, but only wait
    // two seconds after the reliable requests.
    const reliableTestCount = testCount - flakeyTestCount;
    const timeout = 15000;
    const flakeyTimeout = 2000;

    const deadline = Date.now() + timeout;
    let flakeyDeadline = null;
    while (Date.now() < deadline) {
        if (pageRequests.length >= testCount) break;

        if (pageRequests.length >= reliableTestCount) {
            if (!flakeyDeadline) {
                flakeyDeadline = Date.now() + flakeyTimeout;
            } else if (Date.now() >= flakeyDeadline) {
                break;
            }
        }

        await page.waitForTimeout(100);
    }

    if (pageRequests.length < reliableTestCount) {
        throw new Error(
            "Timed out waiting for Request Blocking test page's requests " + `(Received ${pageRequests.length} of ${testCount}).`,
        );
    }

    const pageResults = await page.evaluate(
        // @ts-ignore
        // eslint-disable-next-line no-undef
        () => results.results,
    );

    cleanup();

    return { testCount, pageRequests, pageResults };
}

import { isFirefoxTest } from './playwrightHarness';

const testPageHosts = new Set(['privacy-test-pages.site', 'broken.third-party.site', 'good.third-party.site', 'bad.third-party.site']);

// Tracker/third-party hosts that should NOT be proxied on Firefox so the extension can block them.
// These domains exist on the real internet (privacy-test-pages infrastructure).
const trackerHosts = new Set(['bad.third-party.site', 'broken.third-party.site']);

export const TEST_SERVER_ORIGIN = 'http://127.0.0.1:3000';

const DEBUG_ROUTING = process.env.CI === 'true' || process.env.DEBUG_REQUESTS === '1';

/**
 * Route requests to the local test service (privacy-test-pages)
 * @param {import("@playwright/test").Page} page
 * @param {(route: import("@playwright/test").Route) => boolean} [overrideHandler] Optional handler to
 * intercept additional requests before this route applies.
 */
export function routeFromLocalhost(page, overrideHandler) {
    return page.route('**/*', async (route) => {
        if (overrideHandler && overrideHandler(route)) {
            return;
        }
        const url = new URL(route.request().url());
        if (!testPageHosts.has(url.hostname)) {
            // skip requests for other hosts
            if (DEBUG_ROUTING) {
                console.log('[routeFromLocalhost] continue (not test host):', url.hostname, url.pathname.substring(0, 50));
            }
            return route.continue();
        }

        // For Firefox: Don't proxy tracker hosts - let them go to the real server
        // so the extension's webRequest API can intercept and block them.
        if (isFirefoxTest() && trackerHosts.has(url.hostname)) {
            if (DEBUG_ROUTING) {
                console.log('[routeFromLocalhost] continue (Firefox tracker):', url.hostname, url.pathname.substring(0, 50));
            }
            return route.continue();
        }

        if (DEBUG_ROUTING) {
            console.log('[routeFromLocalhost] proxying to localhost:', url.hostname, url.pathname.substring(0, 50));
        }

        const headers = await route.request().allHeaders();
        // set host header so that the test server knows which content to serve
        headers.host = url.host;
        const requestData = new Request(`${TEST_SERVER_ORIGIN}${url.pathname}${url.search}${url.hash}`, {
            method: route.request().method(),
            body: route.request().postDataBuffer(),
            headers,
            redirect: 'manual',
        });
        const response = await fetch(requestData);
        const responseHeaders = {};
        for (const [key, value] of response.headers.entries()) {
            responseHeaders[key] = value;
        }
        if (url.hostname === 'broken.third-party.site' && url.pathname === '/set-cookie') {
            // There is an issue that proxying somehow bypasses extension cookie protection,
            // so we have to route this request to the real server.
            if (DEBUG_ROUTING) {
                console.log('[routeFromLocalhost] continue (set-cookie exception):', url.hostname);
            }
            return route.continue();
        }
        if (DEBUG_ROUTING) {
            console.log('[routeFromLocalhost] fulfilled:', url.hostname, url.pathname.substring(0, 50), 'status:', response.status);
        }
        return route.fulfill({
            status: response.status,
            body: await response.text(),
            headers: responseHeaders,
        });
    });
}

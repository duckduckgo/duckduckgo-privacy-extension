const testPageHosts = new Set([
    'privacy-test-pages.site',
    'allowlisted.third-party.site',
    'bad.third-party.site',
    'broken.third-party.site',
    'good.third-party.site',
    'convert.ad-company.site',
]);

export const TEST_SERVER_ORIGIN = 'http://127.0.0.1:3000';

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
            // console.log('skipped localhost routing for', url.href)
            return route.continue();
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
            return route.continue();
        }
        return route.fulfill({
            status: response.status,
            body: await response.text(),
            headers: responseHeaders,
        });
    });
}

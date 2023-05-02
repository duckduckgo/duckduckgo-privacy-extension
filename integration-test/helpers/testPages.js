
const testPageHosts = new Set([
    'privacy-test-pages.glitch.me',
    'broken.third-party.site',
    'good.third-party.site',
    'bad.third-party.site',
    'www.search-company.site',
    'convert.ad-company.site',
    'www.publisher-company.site',
    'www.payment-company.site'
])
/**
 * Route requests to the local test service (privacy-test-pages)
 * @param {import("@playwright/test").Page} page
 * @param {(route: import("@playwright/test").Route) => boolean} [overrideHandler] Optional handler to
 * intercept additional requests before this route applies.
 */
export function routeFromLocalhost (page, overrideHandler) {
    return page.route('**/*', async (route) => {
        if (overrideHandler && overrideHandler(route)) {
            return
        }
        const url = new URL(route.request().url())
        if (!testPageHosts.has(url.hostname)) {
            // skip requests for other hosts
            console.log('skipped localhost routing for', url.href)
            return route.continue()
        }
        const requestData = new Request(`http://localhost:3000${url.pathname}${url.search}${url.hash}`, {
            method: route.request().method(),
            body: route.request().postDataBuffer(),
            headers: await route.request().allHeaders()
        })
        const response = await fetch(requestData)
        if (!response.ok) {
            console.log(url.href, requestData.url, response.ok)
        }
        const responseHeaders = {}
        for (const [key, value] of response.headers.entries()) {
            responseHeaders[key] = value
        }
        if (url.hostname === 'broken.third-party.site' && url.pathname === '/set-cookie') {
            // There is an issue that proxying somehow bypasses extension cookie protection,
            // so we have to route this request to the real server.
            return route.continue()
        }
        await new Promise(resolve => setTimeout(resolve, 500))
        return route.fulfill({
            status: response.status,
            body: await response.text(),
            headers: responseHeaders
        })
    })
}

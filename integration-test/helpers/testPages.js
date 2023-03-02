
const testPageHosts = new Set([
    'privacy-test-pages.glitch.me',
    'broken.third-party.site',
    'good.third-party.site',
    'bad.third-party.site'
])
/**
 * Route requests to the local test service (privacy-test-pages)
 * @param {import("@playwright/test").Page} page
 */
export function routeFromLocalhost (page) {
    return page.route('**/*', async (route) => {
        const url = new URL(route.request().url())
        if (!testPageHosts.has(url.hostname)) {
            // skip requests for other hosts
            console.log('skipped localhost routing for', url.href)
            return route.continue()
        }
        const localhostURL = `http://localhost:3000${url.pathname}`
        const request = await fetch(localhostURL)
        return route.fulfill({
            status: request.status,
            body: await request.text()
        })
    })
}

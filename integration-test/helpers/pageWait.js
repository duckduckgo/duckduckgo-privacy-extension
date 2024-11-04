/** Playwright helpers **/

/**
 * Helper to wait for network idle in Playwright tests.
 * @param {import('@playwright/test').Page} page
 *   The Playwright page to watch requests for.
 * @param {number} idleTime
 *   How long with no network connections until finished, in milliseconds.
 */
export function waitForNetworkIdle(page, idleTime = 500) {
    return new Promise((resolve) => {
        let timeout = null
        let requestCount = 0

        const onRequestEvent = (requestCountChange) => {
            requestCount += requestCountChange

            if (requestCount <= 0) {
                timeout = setTimeout(finished, idleTime)
            } else if (timeout) {
                clearTimeout(timeout)
                timeout = null
            }
        }
        const onRequestOpen = onRequestEvent.bind(null, 1)
        const onRequestClose = onRequestEvent.bind(null, -1)

        const finished = () => {
            page.removeListener('request', onRequestOpen)
            page.removeListener('requestfinished', onRequestClose)
            page.removeListener('requestfailed', onRequestClose)
            resolve()
        }

        page.addListener('request', onRequestOpen)
        page.addListener('requestfinished', onRequestClose)
        page.addListener('requestfailed', onRequestClose)

        onRequestEvent(0)
    })
}

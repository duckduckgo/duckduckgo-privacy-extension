const puppeteer = require('puppeteer')

/** Legacy Puppeteer helpers **/

async function waitForNetworkIdleInternal (page) {
    try {
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 })
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            throw new puppeteer.errors.TimeoutError(
                'Timed out waiting for network idle.'
            )
        } else {
            throw e
        }
    }
}

async function forNetworkIdle (page) {
    try {
        await waitForNetworkIdleInternal(page)
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            pending(e.message)
        } else {
            throw e
        }
    }
}

async function forGoto (page, url, permitTimeout = true) {
    try {
        await page.goto(
            url, { waitUntil: 'networkidle0', timeout: 15000 }
        )
        await waitForNetworkIdleInternal(page)
    } catch (e) {
        if (permitTimeout && e instanceof puppeteer.errors.TimeoutError) {
            pending('Timed out loading URL: ' + url)
        } else {
            throw e
        }
    }
}

async function forReload (page) {
    try {
        await page.reload({ waitUntil: 'networkidle0', timeout: 15000 })
        await waitForNetworkIdleInternal(page)
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            pending('Timed out reloading page: ' + page.url())
        } else {
            throw e
        }
    }
}

/** Playwright helpers **/

/**
 * Helper to wait for network idle in Playwright tests.
 * @param {import('@playwright/test').Page} page
 *   The Playwright page to watch requests for.
 * @param {number} idleTime
 *   How long with no network connections until finished, in milliseconds.
 */
function waitForNetworkIdle (page, idleTime = 500) {
    return new Promise(resolve => {
        let timeout = null
        let requestCount = 0

        const onRequestEvent = requestCountChange => {
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

module.exports = {
    forGoto,
    forReload,
    forNetworkIdle,
    waitForNetworkIdle
}

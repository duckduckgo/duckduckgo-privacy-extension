const puppeteer = require('puppeteer')

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

async function forGoto (page, url) {
    try {
        await page.goto(
            url, { waitUntil: 'networkidle0', timeout: 15000 }
        )
        await waitForNetworkIdleInternal(page)
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            pending('Timed out loading URL: ' + url)
        } else {
            pending(`Failed to load URL: ${url} (${e.message}).`)
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
            pending(`Failed to reload page: ${page.url()} (${e.message}).`)
        }
    }
}

module.exports = {
    forGoto,
    forReload,
    forNetworkIdle
}

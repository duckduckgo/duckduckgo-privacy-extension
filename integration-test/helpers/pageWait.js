async function forGoto (page, url) {
    try {
        await page.goto(
            url, { waitUntil: 'networkidle0', timeout: 15000 }
        )
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 })
    } catch (e) {
        pending('Failed to load URL: ' + url)
    }
}

async function forReload (page) {
    try {
        await page.reload({ waitUntil: 'networkidle0', timeout: 15000 })
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 })
    } catch (e) {
        pending('Failed to reload page: ' + page.url())
    }
}

module.exports = {
    forGoto,
    forReload
}

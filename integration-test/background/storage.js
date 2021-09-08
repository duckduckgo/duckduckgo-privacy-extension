const harness = require('../helpers/harness')

const testPageDomain = 'privacy-test-pages.glitch.me'
const thirdPartyDomain = 'good.third-party.site'
const thirdPartyTracker = 'broken.third-party.site'

async function setup () {
    const { browser, bgPage } = await harness.setup()
    const page = await browser.newPage()

    await bgPage.waitForFunction(
        () => {
            console.log('waiting for tds...')
            return window.dbg && window.dbg.tds && window.dbg.tds.tds
        },
        { polling: 100, timeout: 10000 }
    )
    return { browser, page }
}

async function waitForAllResults (page) {
    while ((await page.$$('#tests-details > li > span > ul')).length < 2) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

describe('Storage blocking Tests', () => {
    describe(`On https://${testPageDomain}/privacy-protections/storage-blocking/`, () => {
        let cookies = []

        beforeAll(async () => {
            const { browser, page } = await setup()
            try {
                // Load the test pages home first to give some time for the extension background to start
                // and register the content-script-message handler
                await page.goto(`https://${testPageDomain}/`, { waitUntil: 'networkidle0' })
                await page.bringToFront()
                await page.goto(`https://${testPageDomain}/privacy-protections/storage-blocking/?store`, { waitUntil: 'networkidle2' })
                await waitForAllResults(page)
                // collect all browser cookies
                cookies = (await page._client.send('Network.getAllCookies')).cookies
            } finally {
                await page.close()
                await harness.teardown(browser)
            }
        })

        it('does not block 1st party HTTP cookies', () => {
            const headerCookie = cookies.find(({ name, domain }) => name === 'headerdata' && domain === testPageDomain)
            expect(headerCookie).toBeTruthy()
            expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        it('does not block 3rd party HTTP cookies not on block list', () => {
            const headerCookie = cookies.find(({ name, domain }) => name === 'headerdata' && domain === thirdPartyDomain)
            expect(headerCookie).toBeTruthy()
            expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        it('blocks 3rd party HTTP cookies for trackers', () => {
            const headerCookie = cookies.find(({ name, domain }) => name === 'headerdata' && domain === thirdPartyTracker)
            expect(headerCookie).toBeUndefined()
        })

        it('does not block 1st party JS cookies', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === testPageDomain)
            expect(jsCookie).toBeTruthy()
            expect(jsCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        it('does not block 3rd party JS cookies not on block list', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === thirdPartyDomain)
            expect(jsCookie).toBeTruthy()
            expect(jsCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        it('blocks 3rd party JS cookies from trackers', () => {
            const headerCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === thirdPartyTracker)
            expect(headerCookie).toBeUndefined()
        })

        it('does not block 1st party JS cookies set by non-trackers', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'tpsdata' && domain === testPageDomain)
            expect(jsCookie).toBeTruthy()
            expect(jsCookie.expires).toBeGreaterThan(Date.now() / 1000 + 950400) // 11 days in the future
        })

        it('reduces the expiry of 1st party JS cookies set by trackers to 8 days', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'tptdata' && domain === testPageDomain)
            expect(jsCookie).toBeTruthy()
            expect(jsCookie.expires).toBeGreaterThan(Date.now() / 1000)
            expect(jsCookie.expires).toBeLessThan(Date.now() / 1000 + 864000) // 10 days in the future
        })
    })

    describe(`On https://${thirdPartyTracker}/privacy-protections/storage-blocking/`, () => {
        /*
         * Loads the storage test page on the tracker origin (broken.third-party.site) to test if the same entity
         * rule is observed for frames on that page.
         */
        it('does not block iFrame tracker cookies from same entity', async () => {
            const { browser, page } = await setup()
            await page.goto(`https://${thirdPartyTracker}/privacy-protections/storage-blocking/?store`, { waitUntil: 'networkidle0' })
            await page.bringToFront()
            await waitForAllResults(page)
            await page.click('#retrive')
            await waitForAllResults(page)
            const results = JSON.parse(await page.evaluate('JSON.stringify(results);'))
            const savedResult = results.results.find(({ id }) => id === 'memory').value
            const sameEntityiFrameResult = results.results.find(({ id }) => id === 'tracking third party iframe')?.value.find(({ test }) => test === 'JS cookie')?.result
            expect(sameEntityiFrameResult).toBeTruthy()
            expect(sameEntityiFrameResult).toEqual(savedResult)
            page.close()
            await harness.teardown(browser)
        })
    })
})

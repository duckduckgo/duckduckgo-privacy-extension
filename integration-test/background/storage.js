const harness = require('../helpers/harness')
const { loadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testPageDomain = 'privacy-test-pages.glitch.me'
const thirdPartyDomain = 'good.third-party.site'
const thirdPartyTracker = 'broken.third-party.site'

async function setup () {
    const { browser, bgPage, teardown } = await harness.setup()
    const page = await browser.newPage()

    await backgroundWait.forAllConfiguration(bgPage)
    await loadTestConfig(bgPage, 'storage-blocking.json')

    return { browser, page, teardown, bgPage }
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
            const { page, teardown } = await setup()
            try {
                // Load the test pages home first to give some time for the extension background to start
                // and register the content-script-message handler
                await pageWait.forGoto(page, `https://${testPageDomain}/`)
                await page.bringToFront()
                await pageWait.forGoto(page, `https://${testPageDomain}/privacy-protections/storage-blocking/?store`)
                await waitForAllResults(page)
                const client = await page.target().createCDPSession()
                // collect all browser cookies
                cookies = (await client.send('Network.getAllCookies')).cookies
            } finally {
                await page.close()
                await teardown()
            }
        })

        it('does not block 1st party HTTP cookies', () => {
            const headerCookie = cookies.find(({ name, domain }) => name === 'top_firstparty_headerdata' && domain === testPageDomain)
            expect(headerCookie).toBeTruthy()
            expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        // FIXME - Once Cookie header blocking is working in the experimental
        //         Chrome MV3 build of the extension we should remove this
        //         condition.
        if (harness.getManifestVersion() !== 3) {
            it('allows 3rd party HTTP cookies not on block list', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'top_thirdparty_headerdata' && domain === thirdPartyDomain)
                expect(headerCookie).toBeTruthy()
                expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
            })

            it('blocks 3rd party HTTP cookies for trackers', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'top_tracker_headerdata' && domain === thirdPartyTracker)
                expect(headerCookie).toBeUndefined()
            })

            it('allows 1st party HTTP cookies from non-tracker frames', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'thirdparty_firstparty_headerdata' && domain === thirdPartyDomain)
                expect(headerCookie).toBeTruthy()
                expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
            })

            it('blocks 3rd party tracker HTTP cookies from non-tracker frames', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'thirdparty_tracker_headerdata' && domain === thirdPartyTracker)
                expect(headerCookie).toBeUndefined()
            })

            it('blocks 1st party HTTP cookies from tracker frames', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'thirdpartytracker_firstparty_headerdata' && domain === thirdPartyTracker)
                expect(headerCookie).toBeUndefined()
            })

            it('allows 3rd party tracker HTTP cookies from tracker frames', () => {
                const headerCookie = cookies.find(({ name, domain }) => name === 'thirdpartytracker_thirdparty_headerdata' && domain === thirdPartyDomain)
                expect(headerCookie).toBeTruthy()
                expect(headerCookie.expires).toBeGreaterThan(Date.now() / 1000)
            })
        }

        it('does not block 1st party JS cookies', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === testPageDomain)
            expect(jsCookie).toBeTruthy()
            expect(jsCookie.expires).toBeGreaterThan(Date.now() / 1000)
        })

        it('does not block 3rd party JS cookies not on block list', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === thirdPartyDomain)
            expect(jsCookie).toBeTruthy()
        })

        it('blocks 3rd party JS cookies from trackers', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'jsdata' && domain === thirdPartyTracker)
            expect(jsCookie).toBeUndefined()
        })

        it('does not block 1st party JS cookies set by non-trackers', () => {
            const jsCookie = cookies.find(({ name, domain }) => name === 'tpsdata' && domain === testPageDomain)
            expect(jsCookie).toBeTruthy()
        })

        it('reduces the expiry of all 1st party JS cookies to 7 days', () => {
            const nowSeconds = Date.now() / 1000
            const jsCookies = new Set(['jsdata', 'tptdata', 'tpsdata'])

            for (const { expires, name } of cookies) {
                if (!jsCookies.has(name)) continue

                expect(expires - nowSeconds).toBeGreaterThan(0)
                expect(expires - nowSeconds).toBeLessThan(604800)
            }
        })
    })

    describe(`On https://${thirdPartyTracker}/privacy-protections/storage-blocking/`, () => {
        /*
         * Loads the storage test page on the tracker origin (broken.third-party.site) to test if the same entity
         * rule is observed for frames on that page.
         */
        it('does not block iFrame tracker cookies from same entity', async () => {
            const { page, teardown } = await setup()
            await pageWait.forGoto(page, `https://${thirdPartyTracker}/privacy-protections/storage-blocking/?store`)
            await page.bringToFront()
            await waitForAllResults(page)
            await page.click('#retrive')
            await waitForAllResults(page)
            const results = JSON.parse(await page.evaluate('JSON.stringify(results);'))
            const savedResult = results.results.find(({ id }) => id === 'memory').value
            const sameEntityiFrameResult = results.results.find(({ id }) => id === 'tracking third party iframe - JS cookie')?.value
            expect(sameEntityiFrameResult).toBeTruthy()
            expect(sameEntityiFrameResult).toEqual(savedResult)
            await page.close()
            await teardown()
        })

        it('does not block safe third party iframe JS cookies when protections are disabled', async () => {
            // https://app.asana.com/0/1201614831475344/1203336793368587
            const { page, bgPage, teardown } = await setup()
            // add testPageDomain to the allowlist
            await bgPage.evaluate(async (domain) => {
                return new Promise((resolve, reject) => {
                    chrome.storage.local.get('settings', ({ settings }) => {
                        try {
                            settings.allowlisted = {
                                [domain]: true
                            }
                            chrome.storage.local.set({ settings }, resolve)
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
            }, testPageDomain)
            await pageWait.forGoto(page, `https://${testPageDomain}/privacy-protections/storage-blocking/?store`)
            await page.bringToFront()
            await waitForAllResults(page)
            await page.click('#retrive')
            await waitForAllResults(page)
            const results = JSON.parse(await page.evaluate('JSON.stringify(results);'))
            const savedResult = results.results.find(({ id }) => id === 'memory').value
            const safeFrameCookieResult = results.results.find(({ id }) => id === 'safe third party iframe - JS cookie')?.value
            expect(safeFrameCookieResult).toBeTruthy()
            expect(safeFrameCookieResult).toEqual(savedResult)
            await page.close()
            await teardown()
        })
    })
})

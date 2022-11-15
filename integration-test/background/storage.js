const harness = require('../helpers/harness')
const { loadTestConfig, loadTestTds } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testPageDomain = 'privacy-test-pages.glitch.me'
const thirdPartyDomain = 'good.third-party.site'
const thirdPartyTracker = 'broken.third-party.site'

async function setup () {
    const { browser, bgPage, teardown } = await harness.setup()
    const page = await browser.newPage()

    await backgroundWait.forAllConfiguration(bgPage)

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
            const { page, bgPage, teardown } = await setup()
            await loadTestConfig(bgPage, 'storage-blocking.json')
            await loadTestTds(bgPage, 'mock-tds.json')
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

    async function runStorageTest (page, domain) {
        await pageWait.forGoto(page, `https://${domain}/privacy-protections/storage-blocking/?store`)
        await page.bringToFront()
        await waitForAllResults(page)
        await page.click('#retrive')
        await waitForAllResults(page)
        await page.click('details > summary')
        const results = JSON.parse(await page.evaluate('JSON.stringify(results)'))
        return results
    }

    function assertCookieAllowed (results, testName) {
        const savedResult = results.results.find(({ id }) => id === 'memory').value
        const checkResult = results.results.find(({ id }) => id === testName)?.value
        expect(checkResult).toBeTruthy()
        expect(checkResult).toEqual(savedResult)
    }

    function assertCookieBlocked (results, testName) {
        expect(results.results.find(({ id }) => id === testName).value).toBeNull()
    }

    describe('Cookie blocking tests', () => {
        let testEnv

        beforeAll(async () => {
            testEnv = await setup()
        })

        beforeEach(async () => {
            // reload test configs
            await loadTestConfig(testEnv.bgPage, 'storage-blocking.json')
            await loadTestTds(testEnv.bgPage, 'mock-tds.json')
            // reset allowlists
            await testEnv.bgPage.evaluate(async (domain) => {
                await dbg.tabManager.setList({
                    list: 'allowlisted',
                    domain,
                    value: false
                })
                await dbg.tabManager.setList({
                    list: 'denylisted',
                    domain,
                    value: false
                })
            }, testPageDomain)
        })

        afterAll(async () => {
            const { page, teardown } = testEnv
            await page.close()
            await teardown()
        })

        /*
         * Loads the storage test page on the tracker origin (broken.third-party.site) to test if the same entity
         * rule is observed for frames on that page.
         */
        it(`On ${thirdPartyTracker} does not block iFrame tracker cookies from same entity`, async () => {
            const { page } = testEnv
            const results = await runStorageTest(page, thirdPartyTracker)
            assertCookieAllowed(results, 'tracking third party iframe - JS cookie')
        })

        it('does not block safe third party iframe JS cookies when protections are disabled', async () => {
            // https://app.asana.com/0/1201614831475344/1203336793368587
            const { page, bgPage } = testEnv
            // add testPageDomain to the allowlist
            await bgPage.evaluate(async (domain) => {
                /* global dbg */
                return await dbg.tabManager.setList({
                    list: 'allowlisted',
                    domain,
                    value: true
                })
            }, testPageDomain)
            await pageWait.forGoto(page, `https://${testPageDomain}/`)
            const results = await runStorageTest(page, testPageDomain)
            assertCookieAllowed(results, 'safe third party iframe - JS cookie')
            assertCookieAllowed(results, 'tracking third party header cookie')
        })

        it('excludedCookieDomains disables cookie blocking for that domain', async () => {
            const { page, bgPage } = testEnv
            await bgPage.evaluate(async (domain) => {
                const { data: config } = dbg.getListContents('config')
                config.features.cookie.settings.excludedCookieDomains.push({
                    domain,
                    reason: 'test'
                })
                await dbg.setListContents({
                    name: 'config',
                    value: config
                })
            }, thirdPartyTracker)
            const results = await runStorageTest(page, testPageDomain)
            assertCookieAllowed(results, 'tracking third party header cookie')
        })

        it('feature exception disables all cookie blocking for the site', async () => {
            const { page, bgPage } = testEnv
            await bgPage.evaluate(async (domain) => {
                const { data: config } = dbg.getListContents('config')
                config.features.cookie.exceptions.push({
                    domain,
                    reason: 'test'
                })
                await dbg.setListContents({
                    name: 'config',
                    value: config
                })
            }, testPageDomain)
            const results = await runStorageTest(page, testPageDomain)
            assertCookieAllowed(results, 'tracking third party header cookie')
        })

        it('unprotected temporary disables all cookie blocking for the site', async () => {
            const { page, bgPage } = testEnv
            await bgPage.evaluate(async (domain) => {
                const { data: config } = dbg.getListContents('config')
                config.unprotectedTemporary.push({
                    domain,
                    reason: 'test'
                })
                await dbg.setListContents({
                    name: 'config',
                    value: config
                })
            }, testPageDomain)
            const results = await runStorageTest(page, testPageDomain)
            assertCookieAllowed(results, 'tracking third party header cookie')
        })

        it('denylisting reenables cookie blocking for the site', async () => {
            const { page, bgPage } = testEnv
            await bgPage.evaluate(async (domain) => {
                await dbg.tabManager.setList({
                    list: 'denylisted',
                    domain,
                    value: true
                })
                const { data: config } = dbg.getListContents('config')
                config.unprotectedTemporary.push({
                    domain,
                    reason: 'test'
                })
                await dbg.setListContents({
                    name: 'config',
                    value: config
                })
            }, testPageDomain)
            const results = await runStorageTest(page, testPageDomain)
            assertCookieBlocked(results, 'tracking third party header cookie')
        })
    })
})

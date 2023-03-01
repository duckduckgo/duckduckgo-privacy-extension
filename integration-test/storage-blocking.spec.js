import { test, expect, mockAtb} from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { loadTestConfig, loadTestTds } from './helpers/testConfig'

const testPageDomain = 'privacy-test-pages.glitch.me'
const thirdPartyDomain = 'good.third-party.site'
const thirdPartyTracker = 'broken.third-party.site'

async function waitForAllResults (page) {
    while ((await page.$$('#tests-details > li > span > ul')).length < 2) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

test.describe('Storage blocking Tests', () => {
    test(`Blocks storage correctly on https://${testPageDomain}/privacy-protections/storage-blocking/`, async ({ page, backgroundPage, context }) => {
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)
        await loadTestConfig(backgroundPage, 'storage-blocking.json')
        await loadTestTds(backgroundPage, 'mock-tds.json')
        await page.bringToFront()
        await page.goto(`https://${testPageDomain}/privacy-protections/storage-blocking/?store`, { waitUntil: 'networkidle' })
        await waitForAllResults(page)
        const cookies = await context.cookies()
        const nowSeconds = Date.now() / 1000
        const jsCookies = new Set(['jsdata', 'tptdata', 'tpsdata'])

        const expectUnmodified = (desc) => (c) => expect(c.expires, desc).toBeGreaterThan(nowSeconds)
        const expectBlocked = (desc) => (c) => expect(c, desc).toBeUndefined()
        const expectedCookies = {
            [testPageDomain]: {
                top_firstparty_headerdata: expectUnmodified('does not block 1st party HTTP cookies'),
                jsdata: expectUnmodified('does not block 1st party JS cookies'),
                tpsdata: expectUnmodified('does not block 1st party JS cookies set by non-trackers')
            },
            [thirdPartyDomain]: {
                top_thirdparty_headerdata: expectUnmodified('allows 3rd party HTTP cookies not on block list'),
                thirdparty_firstparty_headerdata: expectUnmodified('allows 1st party HTTP cookies from non-tracker frames'),
                jsdata: expectUnmodified('does not block 3rd party JS cookies not on block list')
            },
            [thirdPartyTracker]: {
                thirdpartytracker_thirdparty_headerdata: expectUnmodified('allows 3rd party tracker HTTP cookies from tracker frames'),
                top_tracker_headerdata: expectBlocked('blocks 3rd party HTTP cookies for trackers'),
                thirdparty_tracker_headerdata: expectBlocked('blocks 3rd party tracker HTTP cookies from non-tracker frames'),
                thirdpartytracker_firstparty_headerdata: expectBlocked('blocks 1st party HTTP cookies from tracker frames'),
                jsdata: expectBlocked('blocks 3rd party JS cookies from trackers')
            }
        }
        for (const cookie of cookies) {
            if (expectedCookies[cookie.domain] && expectedCookies[cookie.domain][cookie.name]) {
                expectedCookies[cookie.domain][cookie.name](cookie)
            }
            if (jsCookies.has(cookie.name)) {
                expect(cookie.expires - nowSeconds).toBeGreaterThan(0)
                expect(cookie.expires - nowSeconds).toBeLessThan(604800)
            }
        }
    })
})

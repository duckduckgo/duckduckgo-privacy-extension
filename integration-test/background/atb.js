const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

// eslint-disable-next-line no-shadow
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const manifestVersion = harness.getManifestVersion()

let browser
let bgPage
let teardown

describe('install workflow', () => {
    describe('atb storage', () => {
        beforeEach(async () => {
            ({ browser, bgPage, teardown } = await harness.setup())
            await backgroundWait.forSetting(bgPage, 'extiSent')
        })

        afterEach(async () => {
            try {
                await teardown()
            } catch (e) {}
        })

        it('should retreive stored ATB value on reload', async () => {
            if (manifestVersion === 3) {
                return
            }

            // set an ATB value from the past
            const pastATBValue = 'v123-1'
            await bgPage.evaluate((pagePastATBValue) => globalThis.dbg.settings.updateSetting('atb', pagePastATBValue), pastATBValue)
            // Reload background
            // FIXME - Will not work for MV3, switch to browser.runtime.reload()?
            await bgPage.evaluate(() => globalThis.location.reload())
            await backgroundWait.forSetting(bgPage, 'extiSent')
            const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
            expect(atb).toEqual(pastATBValue)
        })
    })
})

describe('search workflow', () => {
    let todaysAtb
    let lastWeeksAtb
    let twoWeeksAgoAtb

    beforeAll(async () => {
        ({ browser, bgPage, requests, teardown } = await harness.setup())

        // wait until normal exti workflow is done so we don't confuse atb.js requests
        // when the actual tests run
        await backgroundWait.forSetting(bgPage, 'extiSent')

        // grab current atb data
        let data = await fetch('https://duckduckgo.com/atb.js')
        data = await data.json()
        todaysAtb = data.version
        lastWeeksAtb = `v${data.majorVersion - 1}-${data.minorVersion}`
        twoWeeksAgoAtb = `v${data.majorVersion - 2}-${data.minorVersion}`
    })
    afterAll(async () => {
        try {
            await teardown()
        } catch (e) {}
    })
    beforeEach(async () => {
        try {
            await bgPage.evaluate((atb) => globalThis.dbg.settings.updateSetting('atb', atb), twoWeeksAgoAtb)
        } catch (e) {}
    })
    it('should not update set_atb if a repeat search is made on the same day', async () => {
        // set set_atb to today's version
        await bgPage.evaluate((pageTodaysAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageTodaysAtb), todaysAtb)

        // run a search
        const searchPage = await browser.newPage()
        await pageWait.forGoto(searchPage, 'https://duckduckgo.com/?q=test')

        const newSetAtb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })
    it('should update set_atb if a repeat search is made on a different day', async () => {
        // set set_atb to an older version
        await bgPage.evaluate((pageLastWeeksAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageLastWeeksAtb), lastWeeksAtb)
        // run a search
        const searchPage = await browser.newPage()
        await pageWait.forGoto(searchPage, 'https://duckduckgo.com/?q=test')

        const newSetAtb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })
    it('should update atb if the server passes back updateVersion', async () => {
        // set set_atb and atb to older versions
        await bgPage.evaluate((pageLastWeeksAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageLastWeeksAtb), lastWeeksAtb)
        await bgPage.evaluate(() => globalThis.dbg.settings.updateSetting('atb', 'v123-6'))

        // run a search
        const searchPage = await browser.newPage()
        await pageWait.forGoto(searchPage, 'https://duckduckgo.com/?q=test')

        const newSetAtb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual('v123-1')
    })
})

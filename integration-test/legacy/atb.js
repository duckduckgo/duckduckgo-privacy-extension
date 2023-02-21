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

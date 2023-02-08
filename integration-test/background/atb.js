const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

// eslint-disable-next-line no-shadow
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const manifestVersion = harness.getManifestVersion()

let browser
let bgPage
let requests
let teardown

describe('install workflow', () => {
    describe('postinstall page', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests, teardown } = await harness.setup())
        })

        afterEach(async () => {
            try {
                await teardown()
            } catch (e) {}
        })

        it('should open the postinstall page correctly', async () => {
            let postInstallOpened

            // wait for post install page to open
            // if it never does, jasmine timeout will kick in
            while (!postInstallOpened) {
                const urls = await Promise.all(browser.targets().map(target => target.url()))
                postInstallOpened = urls.find(url => url.includes('duckduckgo.com/extension-success'))
                await backgroundWait.forTimeout(bgPage, 100)
            }
            expect(postInstallOpened).toBeTruthy()
            expect(new URL(postInstallOpened).pathname).toBe('/extension-success')
        })
    })

    describe('atb values', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests, teardown } = await harness.setup())

            /**
             * It's pretty difficult to test the install flow as it
             * immediately happens when the extension is installed,
             * (e.g. we can't add event listeners on time, or set up an install success page)
             *
             * Instead we load up the extension, wait for the ATB process to finish up,
             * then reset everything and simulate a fresh install by calling atb.updateATBValues()
             */
            await backgroundWait.forSetting(bgPage, 'extiSent')

            await bgPage.evaluate(() => {
                globalThis.dbg.settings.removeSetting('atb')
                globalThis.dbg.settings.removeSetting('set_atb')
                globalThis.dbg.settings.removeSetting('extiSent')
            })

            while (requests.length) {
                requests.shift()
            }
        })
        afterEach(async () => {
            try {
                await teardown()
            } catch (e) {}
        })

        it('should get its ATB param from atb.js when there\'s no install success page', async () => {
            if (manifestVersion === 3) {
                // TODO: Can't see requests from service workers. Re-enable once this is fixed
                // https://github.com/puppeteer/puppeteer/issues/2781
                return
            }

            // try get ATB params
            await bgPage.evaluate(() => globalThis.dbg.atb.updateATBValues())
            await backgroundWait.forSetting(bgPage, 'extiSent')

            const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
            const setAtb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
            const extiSent = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toMatch(/v\d+-[1-7]/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()

            let numAtbCalled = 0
            let numExtiCalled = 0

            requests.forEach((url) => {
                if (url.match(/atb\.js/)) {
                    numAtbCalled += 1
                } else if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=${atb}`)
                }
            })

            expect(numAtbCalled).toEqual(1)
            expect(numExtiCalled).toEqual(1)
        })
        it('should get its ATB param from the success page when one is present', async () => {
            if (manifestVersion === 3) {
                // TODO: Can't see requests from service workers. Re-enable once this is fixed
                // https://github.com/puppeteer/puppeteer/issues/2781
                return
            }

            // open a success page and wait for it to have finished loading
            const successPage = await browser.newPage()
            await pageWait.forGoto(successPage, 'https://duckduckgo.com/?natb=v123-4ab&cp=atbhc')

            // try get ATB params again
            await bgPage.evaluate(() => globalThis.dbg.atb.updateATBValues())
            await backgroundWait.forSetting(bgPage, 'extiSent')

            const atb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
            const setAtb = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
            const extiSent = await bgPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toMatch(/v123-4ab/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()

            let numExtiCalled = 0

            requests.forEach((url) => {
                if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=${atb}`)
                    expect(url).toContain('cp=atbhc')
                }
            })

            expect(numExtiCalled).toEqual(1)
        })
    })

    describe('atb storage', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests, teardown } = await harness.setup())
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

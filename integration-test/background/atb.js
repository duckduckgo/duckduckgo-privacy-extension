/* global dbg:false */
const harness = require('../helpers/harness')
const wait = require('../helpers/wait')
const request = require('request')

let browser
let bgPage
let requests

describe('install workflow', () => {
    describe('postinstall page', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests } = await harness.setup())
        })
        afterEach(async () => {
            await harness.teardown(browser)
        })

        it('should open the postinstall page correctly', async () => {
            await wait.ms(2000)
            let postInstallOpened = await browser.targets().some(async (target) => {
                let url = await target.url()

                return url.match(/duckduckgo\.com\/install\?post=1/)
            })

            expect(postInstallOpened).toBeTruthy()
        })
    })

    describe('atb values', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests } = await harness.setup())

            /**
             * It's pretty difficult to test the install flow as it
             * immediately happens when the extension is installed,
             * (e.g. we can't add event listeners on time, or set up an install success page)
             *
             * Instead we load up the extension, wait for the ATB process to finish up,
             * then reset everything and simulate a fresh install by calling atb.updateATBValues()
             */
            await wait.forSetting(bgPage, 'extiSent')

            await bgPage.evaluate(() => {
                dbg.settings.removeSetting('atb')
                dbg.settings.removeSetting('set_atb')
                dbg.settings.removeSetting('extiSent')
            })

            while (requests.length) {
                requests.shift()
            }
        })
        afterEach(async () => {
            await harness.teardown(browser)
        })

        it('should get its ATB param from atb.js when there\'s no install success page', async () => {
            // try get ATB params
            await bgPage.evaluate(() => dbg.atb.updateATBValues())
            await wait.forSetting(bgPage, 'extiSent')

            let atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
            let setAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
            let extiSent = await bgPage.evaluate(() => dbg.settings.getSetting('extiSent'))

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
            // open a success page and wait for it to have finished loading
            let successPage = await browser.newPage()
            await successPage.goto('https://duckduckgo.com/?exti=2')
            await successPage.waitFor(() => document.querySelector('html').getAttribute('data-chromeatb'))

            // try get ATB params again
            await bgPage.evaluate(() => dbg.atb.updateATBValues())
            await wait.forSetting(bgPage, 'extiSent')

            let atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
            let setAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
            let extiSent = await bgPage.evaluate(() => dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toMatch(/v\d+-[1-7][a-z_]{2}/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()

            let numExtiCalled = 0

            requests.forEach((url) => {
                if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=${atb}`)
                }
            })

            expect(numExtiCalled).toEqual(1)
        })
    })
})

describe('search workflow', () => {
    let todaysAtb
    let lastWeeksAtb

    beforeAll(async () => {
        ({ browser, bgPage, requests } = await harness.setup())

        // wait until normal exti workflow is done so we don't confuse atb.js requests
        // when the actual tests run
        await wait.forSetting(bgPage, 'extiSent')
        await bgPage.evaluate(() => dbg.settings.updateSetting('atb', 'v112-1'))

        // request needs to be promisified
        await new Promise(resolve => {
            request('https://duckduckgo.com/atb.js', (err, res, body) => {
                expect(err).toBeFalsy()

                let data = JSON.parse(body)
                todaysAtb = data.version
                lastWeeksAtb = `${data.majorVersion - 1}-${data.minorVersion}`
                resolve()
            })
        })
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })
    it('should not update set_atb if a repeat search is made on the same day', async () => {
        // set set_atb to today's version
        await bgPage.evaluate((todaysAtb) => dbg.settings.updateSetting('set_atb', todaysAtb), todaysAtb)

        // run a search
        const searchPage = await browser.newPage()
        searchPage.goto('https://duckduckgo.com/?q=test')

        await bgPage.waitForResponse(res => res.url().match(/atb\.js/))
        await wait.ms(1000)

        let newSetAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
        expect(newSetAtb).toEqual(todaysAtb)
    })
    it('should update set_atb if a repeat search is made on a different day', async () => {
        // set set_atb to an older version
        await bgPage.evaluate((lastWeeksAtb) => dbg.settings.updateSetting('set_atb', lastWeeksAtb), lastWeeksAtb)

        // run a search
        const searchPage = await browser.newPage()
        searchPage.goto('https://duckduckgo.com/?q=test')

        await bgPage.waitForResponse(res => res.url().match(/atb\.js/))
        await wait.ms(1000)

        let newSetAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
        expect(newSetAtb).toEqual(todaysAtb)
    })
})

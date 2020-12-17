/* global dbg:false */
const harness = require('../helpers/harness')
const wait = require('../helpers/wait')
const fetch = require('node-fetch')

let browser
let bgPage
let requests

describe('install workflow', () => {
    describe('postinstall page', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests } = await harness.setup())
        })

        afterEach(async () => {
            try {
                await harness.teardown(browser)
            } catch (e) {}
        })

        it('should open the postinstall page correctly', async () => {
            let postInstallOpened

            // wait for post install page to open
            // if it never does, jasmine timeout will kick in
            while (!postInstallOpened) {
                await wait.ms(100)
                postInstallOpened = await browser.targets().some(async (target) => {
                    const url = await target.url()

                    return url.match(/duckduckgo\.com\/install\?post=1/)
                })
            }

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
            try {
                await harness.teardown(browser)
            } catch (e) {}
        })

        it('should get its ATB param from atb.js when there\'s no install success page', async () => {
            // try get ATB params
            await bgPage.evaluate(() => dbg.atb.updateATBValues())
            await wait.forSetting(bgPage, 'extiSent')

            const atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
            const setAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
            const extiSent = await bgPage.evaluate(() => dbg.settings.getSetting('extiSent'))

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
            const successPage = await browser.newPage()
            try {
                await successPage.goto('https://duckduckgo.com/?natb=v123-4ab&cp=atbhc')
            } catch (e) {
                // goto may time out, but continue test anyway in case of partial load.
            }

            // try get ATB params again
            await bgPage.evaluate(() => dbg.atb.updateATBValues())
            await wait.forSetting(bgPage, 'extiSent')

            const atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
            const setAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
            const extiSent = await bgPage.evaluate(() => dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toMatch(/v123-4ab/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()

            let numExtiCalled = 0

            requests.forEach((url) => {
                if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=${atb}`)
                    expect(url).toContain(`cp=atbhc`)
                }
            })

            expect(numExtiCalled).toEqual(1)
        })
    })
})

describe('search workflow', () => {
    let todaysAtb
    let lastWeeksAtb
    let twoWeeksAgoAtb

    beforeAll(async () => {
        ({ browser, bgPage, requests } = await harness.setup())

        // wait until normal exti workflow is done so we don't confuse atb.js requests
        // when the actual tests run
        await wait.forSetting(bgPage, 'extiSent')

        // grab current atb data
        let data = await fetch('https://duckduckgo.com/atb.js')
        data = await data.json()
        todaysAtb = data.version
        lastWeeksAtb = `v${data.majorVersion - 1}-${data.minorVersion}`
        twoWeeksAgoAtb = `v${data.majorVersion - 2}-${data.minorVersion}`
    })
    afterAll(async () => {
        try {
            await harness.teardown(browser)
        } catch (e) {}
    })
    beforeEach(async () => {
        try {
            await bgPage.evaluate((atb) => dbg.settings.updateSetting('atb', atb), twoWeeksAgoAtb)
        } catch (e) {}
    })
    it('should not update set_atb if a repeat search is made on the same day', async () => {
        // set set_atb to today's version
        await bgPage.evaluate((todaysAtb) => dbg.settings.updateSetting('set_atb', todaysAtb), todaysAtb)

        // run a search
        const searchPage = await browser.newPage()
        try {
            await searchPage.goto('https://duckduckgo.com/?q=test')
            // Extra wait for page load
            await wait.ms(1000)
        } catch (e) {
            // goto may time out, but continue test anyway in case of partial load.
        }

        const newSetAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })
    it('should update set_atb if a repeat search is made on a different day', async () => {
        // set set_atb to an older version
        await bgPage.evaluate((lastWeeksAtb) => dbg.settings.updateSetting('set_atb', lastWeeksAtb), lastWeeksAtb)
        // run a search
        const searchPage = await browser.newPage()
        try {
            await searchPage.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle0' })
            // Extra wait for page load
            await wait.ms(1000)
        } catch (e) {
            // goto may time out, but continue test anyway in case of partial load.
        }

        const newSetAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })
    it('should update atb if the server passes back updateVersion', async () => {
        // set set_atb and atb to older versions
        await bgPage.evaluate((lastWeeksAtb) => dbg.settings.updateSetting('set_atb', lastWeeksAtb), lastWeeksAtb)
        await bgPage.evaluate(() => dbg.settings.updateSetting('atb', 'v123-6'))

        // run a search
        const searchPage = await browser.newPage()
        try {
            await searchPage.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle0' })
            // Extra wait for page load
            await wait.ms(1000)
        } catch (e) {
            // goto may time out, but continue test anyway in case of partial load.
        }

        const newSetAtb = await bgPage.evaluate(() => dbg.settings.getSetting('set_atb'))
        const atb = await bgPage.evaluate(() => dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual('v123-1')
    })
})

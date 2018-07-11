/* global dbg:false */
const helpers = require('../helpers')

let browser
let bgPage
let requests

describe('install workflow', () => {
    describe('basic workflow (no success page)', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests } = await helpers.setup())
            await helpers.wait(2000)
        })
        afterEach(async () => {
            await helpers.teardown(browser)
        })

        it('should open the postinstall page correctly', async () => {
            let postInstallOpened = await browser.targets().some(async (target) => {
                let url = await target.url()

                return url.match(/duckduckgo\.com\/install\?post=1/)
            })

            expect(postInstallOpened).toBeTruthy()
        })
        it('should get its ATB param from atb.js correctly', async () => {
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
    })
    describe('workflow with success page', () => {
        beforeEach(async () => {
            ({ browser, bgPage, requests } = await helpers.setup())
            await helpers.wait(2000)
        })
        afterEach(async () => {
            await helpers.teardown(browser)
        })

        it('should get its atb param from the success page correctly', async () => {
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

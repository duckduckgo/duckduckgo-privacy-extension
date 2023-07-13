import { forExtensionLoaded } from './helpers/backgroundWait'
import { test, expect, getManifestVersion } from './helpers/playwrightHarness'
import { routeFromLocalhost } from './helpers/testPages'

const burnAnimationRegex = /^chrome-extension:\/\/[a-z]*\/html\/fire.html$/

async function loadPageInNewTab (context, url) {
    const page = await context.newPage()
    routeFromLocalhost(page)
    await page.goto(url, { waitUntil: 'networkidle' })
    return page
}

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<import('@playwright/test').Page[]>}
 */
function openTabs (context) {
    return Promise.all([
        loadPageInNewTab(context, 'https://duckduckgo.com/'),
        loadPageInNewTab(context, 'https://privacy-test-pages.glitch.me/'),
        loadPageInNewTab(context, 'https://good.third-party.site/privacy-protections/storage-blocking/?store'),
        loadPageInNewTab(context, 'https://privacy-test-pages.glitch.me/privacy-protections/storage-blocking/?store')
    ])
}

function getOpenTabs (backgroundPage) {
    return backgroundPage.evaluate(() => {
        return new Promise(resolve => chrome.tabs.query({}, resolve))
    })
}

async function requestBrowsingDataPermissions (backgroundPage) {
    const permissionGranted = await backgroundPage.evaluate(() =>
        new Promise(resolve => chrome.permissions.request({ permissions: ['browsingData'] }, resolve))
    )
    expect(permissionGranted).toBeTruthy()
}

/**
 * @param {*} backgroundPage
 * @returns {Promise<import('@playwright/test').JSHandle>}
 */
function getFireButtonHandle (backgroundPage) {
    return backgroundPage.evaluateHandle(() => globalThis.features.fireButton)
}

async function waitForAllResults (page) {
    while ((await page.$$('#tests-details > li > span > ul')).length < 2) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

test.describe('Fire Button', () => {
    test('Fire animation', async ({ context, backgroundPage }) => {
        await forExtensionLoaded(context)
        const fireButton = await getFireButtonHandle(backgroundPage)
        // detect the burn animation extension page being opened, and return the page object
        const animationLoaded = new Promise((resolve) => {
            context.once('page', (page) => {
                if (page.url().match(burnAnimationRegex)) {
                    resolve(page)
                }
            })
        })
        // trigger the animation
        await fireButton.evaluate(f => f.showBurnAnimation())
        const burnAnimationPage = await animationLoaded
        // wait for the animation to complete
        await new Promise(resolve => setTimeout(resolve, 3000))
        // check that we're redirected to the newtab page after the animation completes
        expect(burnAnimationPage.url()).toMatch(/^(https:\/\/duckduckgo.com\/chrome_newtab|chrome:\/\/new-tab-page\/$)/)
    })

    test.describe('Tab clearing', () => {
        const testCases = [{
            desc: 'clearing all tabs',
            args: [true],
            expectedTabs: 1
        }, {
            desc: 'clearing no tabs',
            args: [false],
            expectedTabs: 7
        }, {
            desc: 'clearing specific origins',
            args: [true, ['https://privacy-test-pages.glitch.me/', 'https://duckduckgo.com/']],
            expectedTabs: 3
        }]

        testCases.forEach(({ desc, args, expectedTabs }) => {
            test(desc, async ({ context, backgroundPage }) => {
                await forExtensionLoaded(context)
                // get the firebutton feature
                const fireButton = await getFireButtonHandle(backgroundPage)
                await openTabs(context)
                await Promise.all([
                    fireButton.evaluate((f, argsInner) => f.clearTabs(...argsInner), args),
                    context.waitForEvent('page')
                ])
                // expect((await getOpenTabs(backgroundPage)).map(t => t.url)).toEqual([])
                expect(context.pages()).toHaveLength(expectedTabs)
                expect((await getOpenTabs(backgroundPage)).find(({ active }) => active).url).toMatch(burnAnimationRegex)
            })
        })
    })

    test.skip('getBurnOptions', async ({ context, backgroundPage }) => {
        await forExtensionLoaded(context)
        const fireButton = await getFireButtonHandle(backgroundPage)
        const pages = await openTabs(context)
        await pages[1].bringToFront()
        await pages[1].waitForTimeout(500)

        {
            // default options on an clearable site
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options).toHaveLength(6) // current site, plus 5 time frames
            expect(options[5]).toMatchObject({
                name: 'CurrentSite',
                options: {
                    origins: ['https://privacy-test-pages.glitch.me', 'http://privacy-test-pages.glitch.me']
                },
                descriptionStats: {
                    clearHistory: true,
                    cookies: 1,
                    duration: 'all',
                    openTabs: 2, // gets the number of tabs matching this origin
                    pinnedTabs: 0,
                    site: 'privacy-test-pages.glitch.me'
                },
                selected: true
            })
            expect(options[2]).toMatchObject({
                name: 'Last7days',
                descriptionStats: {
                    clearHistory: true,
                    cookies: 3, // gets the number of domains with cookies set
                    duration: 'week',
                    openTabs: 6, // gets all open tabs that will be cleared
                    pinnedTabs: 0
                }
            })
            expect(options[2].options.since).toBeGreaterThan(Date.now() - (8 * 24 * 60 * 60 * 1000))
        }

        // default options on a non-clearable site
        await context.pages()[0].bringToFront()
        {
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options).toHaveLength(5) // only 5 time frames
        }
        await pages[0].bringToFront()

        // with pinned tabs
        const tabs = await getOpenTabs(backgroundPage)
        await backgroundPage.evaluate((tabIds) => {
            tabIds.forEach(id => chrome.tabs.update(id, { pinned: true }))
        }, tabs.filter(t => t.url.startsWith('https://duckduckgo.com/')).map(t => t.id))
        {
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options.every(o => o.descriptionStats.pinnedTabs === 2)).toBeTruthy()
        }
        // if we select a non-pinned tab, that will not have the pinnedTabs option
        await pages[1].bringToFront()
        {
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options[5]).toMatchObject({
                descriptionStats: {
                    pinnedTabs: 0
                }
            })
            expect(options[0]).toMatchObject({
                descriptionStats: {
                    pinnedTabs: 2
                }
            })
        }

        // if clearHistory setting is disabled
        await backgroundPage.evaluate(() => {
            /* global dbg */
            dbg.settings.updateSetting('fireButtonClearHistoryEnabled', false)
        })
        {
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options.every(o => o.descriptionStats.clearHistory === false)).toBeTruthy()
        }

        // if clearTabs setting is disabled
        await backgroundPage.evaluate(() => {
            dbg.settings.updateSetting('fireButtonClearHistoryEnabled', true)
            dbg.settings.updateSetting('fireButtonTabClearEnabled', false)
        })
        {
            const { options } = await fireButton.evaluate(f => f.getBurnOptions())
            expect(options.every(o => o.descriptionStats.openTabs === 0)).toBeTruthy()
            expect(options.every(o => o.descriptionStats.pinnedTabs === 0)).toBeTruthy()
        }
    })

    test.skip('burn', () => {
        // Skip these tests on MV3.
        // For these tests to work, we need to be able to successfully request the optional `browsingData`
        // permission at runtime (`requestBrowsingDataPermissions`). When running these tests in Playwright,
        // this works without issue with the MV2 extension, however in MV3 the permission is rejected.
        if (getManifestVersion() === 3) {
            return
        }
        test('clears tabs and storage', async ({ context, backgroundPage }) => {
            await forExtensionLoaded(context)
            await requestBrowsingDataPermissions(backgroundPage)
            const fireButton = await getFireButtonHandle(backgroundPage)
            await openTabs(context)

            expect((await context.cookies()).length).toBeGreaterThan(0)
            await fireButton.evaluate(f => f.burn({}))
            expect((await getOpenTabs(backgroundPage)).length).toBe(1)
            expect(await context.cookies()).toEqual([])
        })

        test('exempts duckduckgo.com cookies', async ({ context, backgroundPage }) => {
            await forExtensionLoaded(context)
            await requestBrowsingDataPermissions(backgroundPage)
            const fireButton = await getFireButtonHandle(backgroundPage)
            const ddgCookie = {
                name: 'ae',
                value: 'd',
                domain: 'duckduckgo.com',
                httpOnly: false,
                path: '/',
                sameSite: 'Lax',
                secure: true
            }
            await context.addCookies([ddgCookie])
            await openTabs(context)

            expect((await context.cookies()).length).toBeGreaterThan(0)
            await fireButton.evaluate(f => f.burn({}))
            expect((await getOpenTabs(backgroundPage)).length).toBe(1)
            expect(await context.cookies()).toMatchObject([ddgCookie])
        })

        test('clearing for a specific site', async ({ context, backgroundPage }) => {
            await forExtensionLoaded(context)
            await requestBrowsingDataPermissions(backgroundPage)
            const fireButton = await getFireButtonHandle(backgroundPage)
            await openTabs(context)

            await fireButton.evaluate(f => f.burn({
                origins: ['https://privacy-test-pages.glitch.me', 'http://privacy-test-pages.glitch.me']
            }))

            const tabs = await getOpenTabs(backgroundPage)
            expect(tabs.every(t => !t.url.includes('privacy-test-pages.glitch.me'))).toBeTruthy()
            const cookieDomains = (await context.cookies()).map(c => c.domain)
            expect(cookieDomains).not.toContain('privacy-test-pages.glitch.me')
            expect(cookieDomains).toContain('good.third-party.site')
        })

        test('clears all browser storage', async ({ context, backgroundPage, page }) => {
            await forExtensionLoaded(context)
            await requestBrowsingDataPermissions(backgroundPage)
            await routeFromLocalhost(page)
            await page.goto('https://privacy-test-pages.glitch.me/privacy-protections/storage-blocking/?store', { waitUntil: 'networkidle' })
            const storedValue = new URL(page.url()).hash.slice(1)
            await (await getFireButtonHandle(backgroundPage)).evaluate(f => f.burn({}))

            const newPage = await context.newPage()
            await routeFromLocalhost(newPage)
            await newPage.goto('https://privacy-test-pages.glitch.me/privacy-protections/storage-blocking/?retrive', { waitUntil: 'networkidle' })
            await waitForAllResults(newPage)
            const { results } = await JSON.parse(await newPage.evaluate('JSON.stringify(results)'))
            const apis = [
                'JS cookie', 'localStorage', 'Cache API', 'WebSQL', 'service worker', 'first party header cookie', 'IndexedDB', 'browser cache'
            ]
            for (const api of apis) {
                expect(results.find(r => r.id === api).value, `${api} data should be cleared`).not.toBe(storedValue)
            }
        })

        test('clear data without clearing tabs', async ({ context, backgroundPage, page }) => {
            await forExtensionLoaded(context)
            await requestBrowsingDataPermissions(backgroundPage)
            const fireButton = await getFireButtonHandle(backgroundPage)
            await openTabs(context)

            await fireButton.evaluate(f => f.burn({
                closeTabs: false
            }))

            expect((await getOpenTabs(backgroundPage)).length).toBe(8)
            expect(await context.cookies()).toEqual([])
        })
    })
})

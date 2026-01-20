import { test, expect, isFirefoxTest } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig, overrideTds } from './helpers/testConfig';
import { TEST_SERVER_ORIGIN, routeFromLocalhost } from './helpers/testPages';

// Firefox: Skip tests that need TDS/config override. The RDP evaluate mechanism
// can't reliably handle data larger than ~500 bytes.
// TODO: Find a way to bundle test data in the extension build for Firefox.
test.skip(isFirefoxTest(), 'Firefox: RDP cannot handle large TDS/config data');

const testPageDomain = 'privacy-test-pages.site';
const thirdPartyDomain = 'good.third-party.site';
const thirdPartyTracker = 'broken.third-party.site';
const thirdPartyAd = 'convert.ad-company.site';

async function waitForAllResults(page) {
    while ((await page.$$('#tests-details > li > span > ul')).length < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

test.describe('Storage blocking Tests', () => {
    test(`Blocks storage correctly on https://${testPageDomain}/privacy-protections/storage-blocking/`, async ({
        page,
        backgroundPage,
        context,
        backgroundNetworkContext,
    }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'storage-blocking.json');
        await overrideTds(backgroundNetworkContext, 'mock-tds.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);
        await page.bringToFront();
        await page.goto(`https://${testPageDomain}/privacy-protections/storage-blocking/?store`, { waitUntil: 'networkidle' });
        await waitForAllResults(page);
        const cookies = await context.cookies();
        const nowSeconds = Date.now() / 1000;
        const jsCookies = new Set(['jsdata', 'tptdata', 'tpsdata']);

        const expectUnmodified = (desc) => (c) => expect(c.expires, desc).toBeGreaterThan(nowSeconds);
        const expectBlocked = (desc) => (c) => expect(c, desc).toBeUndefined();
        const expectedCookies = {
            [testPageDomain]: {
                top_firstparty_headerdata: expectUnmodified('does not block 1st party HTTP cookies'),
                jsdata: expectUnmodified('does not block 1st party JS cookies'),
                tpsdata: expectUnmodified('does not block 1st party JS cookies set by non-trackers'),
            },
            [thirdPartyDomain]: {
                top_thirdparty_headerdata: expectUnmodified('allows 3rd party HTTP cookies not on block list'),
                thirdparty_firstparty_headerdata: expectUnmodified('allows 1st party HTTP cookies from non-tracker frames'),
                jsdata: expectUnmodified('does not block 3rd party JS cookies not on block list'),
            },
            [thirdPartyAd]: {
                top_thirdparty_headerdata: expectUnmodified('allows 3rd party HTTP cookies not on block list'),
                thirdparty_firstparty_headerdata: expectUnmodified('allows 1st party HTTP cookies from non-tracker frames'),
                jsdata: expectUnmodified('does not block 3rd party JS cookies not on block list'),
            },
            [thirdPartyTracker]: {
                thirdpartytracker_thirdparty_headerdata: expectUnmodified('allows 3rd party tracker HTTP cookies from tracker frames'),
                top_tracker_headerdata: expectBlocked('blocks 3rd party HTTP cookies for trackers'),
                thirdparty_tracker_headerdata: expectBlocked('blocks 3rd party tracker HTTP cookies from non-tracker frames'),
                thirdpartytracker_firstparty_headerdata: expectBlocked('blocks 1st party HTTP cookies from tracker frames'),
                jsdata: expectBlocked('blocks 3rd party JS cookies from trackers'),
            },
        };
        for (const cookie of cookies) {
            if (expectedCookies[cookie.domain] && expectedCookies[cookie.domain][cookie.name]) {
                expectedCookies[cookie.domain][cookie.name](cookie);
            }
            if (jsCookies.has(cookie.name)) {
                expect(cookie.expires - nowSeconds).toBeGreaterThan(0);
                expect(cookie.expires - nowSeconds).toBeLessThan(604800);
                if (cookie.domain === thirdPartyTracker) {
                    expect(cookie.expires - nowSeconds, `cookie expires for ${cookie.domain}`).toBeLessThan(86400);
                } else if (cookie.domain === thirdPartyAd) {
                    expect(cookie.expires - nowSeconds, `cookie expires for ${cookie.domain}`).toBeGreaterThan(86400);
                }
            }
        }
    });

    test.describe('Cookie blocking tests', () => {
        async function runStorageTest(page, origin) {
            await page.bringToFront();
            await page.goto(`${origin}/privacy-protections/storage-blocking/?store`);
            await waitForAllResults(page);
            await page.click('#retrive');
            await waitForAllResults(page);
            await page.click('details > summary');
            const results = JSON.parse(await page.evaluate('JSON.stringify(results)'));
            return results;
        }

        function assertCookieAllowed(results, testName) {
            const savedResult = results.results.find(({ id }) => id === 'memory').value;
            const checkResult = results.results.find(({ id }) => id === testName)?.value;
            expect(checkResult).toBeTruthy();
            expect(checkResult).toEqual(savedResult);
        }

        function assertCookieBlocked(results, testName) {
            expect(results.results.find(({ id }) => id === testName).value).toBeNull();
        }

        test.beforeEach(async ({ context, backgroundPage, page, backgroundNetworkContext }) => {
            await overridePrivacyConfig(backgroundNetworkContext, 'storage-blocking.json');
            await overrideTds(backgroundNetworkContext, 'mock-tds.json');
            await backgroundWait.forExtensionLoaded(context);
            await backgroundWait.forAllConfiguration(backgroundPage);
            await routeFromLocalhost(page);

            // reset allowlists
            await backgroundPage.evaluate(async (domain) => {
                /* global dbg */
                await dbg.tabManager.setList({
                    list: 'allowlisted',
                    domain,
                    value: false,
                });
                await dbg.tabManager.setList({
                    list: 'denylisted',
                    domain,
                    value: false,
                });
            }, testPageDomain);
        });

        test(`On ${thirdPartyTracker} does not block iFrame tracker cookies from same entity`, async ({ page }) => {
            const results = await runStorageTest(page, `https://${thirdPartyTracker}`);
            assertCookieAllowed(results, 'tracking third party iframe - JS cookie');
        });

        test('does not block safe third party iframe JS cookies when protections are disabled', async ({ page, backgroundPage }) => {
            // https://app.asana.com/0/1201614831475344/1203336793368587
            // add testPageDomain to the allowlist
            await backgroundPage.evaluate(async (domain) => {
                return await dbg.tabManager.setList({
                    list: 'allowlisted',
                    domain,
                    value: true,
                });
            }, testPageDomain);
            const results = await runStorageTest(page, `https://${testPageDomain}`);
            assertCookieAllowed(results, 'safe third party iframe - JS cookie');
            assertCookieAllowed(results, 'tracking third party header cookie');
        });

        test('excludedCookieDomains disables cookie blocking for that domain', async ({ page, backgroundPage }) => {
            await backgroundPage.evaluate(async (domain) => {
                /** @type {import('../shared/js/background/components/resource-loader').default} */
                const configLoader = globalThis.components.tds.config;
                await configLoader.modify((config) => {
                    config.features.cookie.settings.excludedCookieDomains.push({
                        domain,
                        reason: 'test',
                    });
                    return config;
                });
            }, thirdPartyTracker);
            const results = await runStorageTest(page, `https://${testPageDomain}`);
            assertCookieAllowed(results, 'tracking third party header cookie');
        });

        test('feature exception disables all cookie blocking for the site', async ({ page, backgroundPage }) => {
            await backgroundPage.evaluate(async (domain) => {
                /** @type {import('../shared/js/background/components/resource-loader').default} */
                const configLoader = globalThis.components.tds.config;
                await configLoader.modify((config) => {
                    config.features.cookie.exceptions.push({
                        domain,
                        reason: 'test',
                    });
                    return config;
                });
            }, testPageDomain);
            const results = await runStorageTest(page, `https://${testPageDomain}`);
            assertCookieAllowed(results, 'tracking third party header cookie');
        });

        test('unprotected temporary disables all cookie blocking for the site', async ({ page, backgroundPage }) => {
            await backgroundPage.evaluate(async (domain) => {
                /** @type {import('../shared/js/background/components/resource-loader').default} */
                const configLoader = globalThis.components.tds.config;
                await configLoader.modify((config) => {
                    config.unprotectedTemporary.push({
                        domain,
                        reason: 'test',
                    });
                    return config;
                });
            }, testPageDomain);
            const results = await runStorageTest(page, `https://${testPageDomain}`);
            assertCookieAllowed(results, 'tracking third party header cookie');
        });

        test('denylisting reenables cookie blocking for the site', async ({ page, backgroundPage }) => {
            await backgroundPage.evaluate(async (domain) => {
                await dbg.tabManager.setList({
                    list: 'denylisted',
                    domain,
                    value: true,
                });
                /** @type {import('../shared/js/background/components/resource-loader').default} */
                const configLoader = globalThis.components.tds.config;
                await configLoader.modify((config) => {
                    config.unprotectedTemporary.push({
                        domain,
                        reason: 'test',
                    });
                    return config;
                });
            }, testPageDomain);
            // await page.waitForTimeout(500)
            const results = await runStorageTest(page, `https://${testPageDomain}`);
            // await page.waitForTimeout(50000)
            assertCookieBlocked(results, 'tracking third party header cookie');
        });

        test('protections are not active on localhost', async ({ page }) => {
            const results = await runStorageTest(page, TEST_SERVER_ORIGIN);
            assertCookieAllowed(results, 'tracking third party header cookie');
        });
    });
});

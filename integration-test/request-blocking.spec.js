import { test, expect, isFirefox } from './helpers/playwrightHarness';
import { forAllConfiguration, forExtensionLoaded, forDynamicDNRRulesLoaded } from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';
import { TEST_SERVER_ORIGIN } from './helpers/testPages';
import { runRequestBlockingTest } from './helpers/requests';

const testHost = 'privacy-test-pages.site';
const testSite = `https://${testHost}/privacy-protections/request-blocking/`;

test.describe('Test request blocking', () => {
    test('Should block all the test tracking requests', async ({
        page,
        backgroundPage,
        context,
        backgroundNetworkContext,
        manifestVersion,
    }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'serviceworker-blocking.json');
        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            await forDynamicDNRRulesLoaded(backgroundPage);
        }

        const { testCount, pageRequests, pageResults } = await runRequestBlockingTest(page, testSite, { backgroundPage });

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`;
            expect(status, description).toEqual('blocked');
        }

        // Also check that the test page itself agrees that no requests were
        // allowed.
        for (const { id, category, status } of pageResults) {
            if (isFirefox() && id === 'font') {
                continue;
            }
            const description = `ID: ${id}, Category: ${category}`;
            expect(status, description).not.toEqual('loaded');
        }

        // Test the extension's tracker reporting matches the expected outcomes.
        const extensionTrackers = await backgroundPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab();
            return globalThis.dbg.tabManager.get({ tabId: currentTab.id }).trackers;
        });

        const extensionTrackersCount = extensionTrackers['Test Site for Tracker Blocking'].count;
        expect(extensionTrackersCount).toBeGreaterThanOrEqual(testCount);

        expect(extensionTrackers).toMatchObject({
            'privacy-test-pages.site': {
                urls: {},
                count: 0,
                displayName: 'privacy-test-pages.site',
            },
            'Test Site for Tracker Blocking': {
                displayName: 'Bad Third Party Site',
                prevalence: 0.1,
                urls: {
                    'bad.third-party.site:block': {
                        action: 'block',
                        // URL varies by request order, so just check it's from the right domain
                        url: expect.stringContaining('https://bad.third-party.site/privacy-protections/request-blocking/block-me/'),
                        eTLDplus1: 'third-party.site',
                        pageUrl: 'https://privacy-test-pages.site/privacy-protections/request-blocking/',
                        entityName: 'Bad Third Party Site',
                        prevalence: 0.1,
                        state: { blocked: {} },
                    },
                },
                count: extensionTrackersCount,
            },
        });

        await page.close();
    });

    test('serviceworkerInitiatedRequests exceptions should disable service worker blocking', async ({
        page,
        backgroundPage,
        context,
        backgroundNetworkContext,
        manifestVersion,
    }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'serviceworker-blocking.json');
        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            await forDynamicDNRRulesLoaded(backgroundPage);
        }
        await backgroundPage.evaluate(async (domain) => {
            /** @type {import('../shared/js/background/components/resource-loader').default} */
            const configLoader = globalThis.components.tds.config;
            await configLoader.modify((config) => {
                config.features.serviceworkerInitiatedRequests.exceptions.push({
                    domain,
                    reason: 'test',
                });
                return config;
            });
        }, testHost);
        const { pageRequests, pageResults } = await runRequestBlockingTest(page, testSite, { backgroundPage });

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`;
            // Firefox: serviceworker requests are allowed due to the exception we added above.
            if (isFirefox() && url.includes('serviceworker')) {
                expect(status, description).toEqual('allowed');
            } else {
                expect(status, description).toEqual('blocked');
            }
        }

        // Check that the test page itself agrees that no requests were
        // allowed.
        for (const { id, category, status } of pageResults) {
            if (isFirefox() && id === 'font') {
                continue;
            }
            const description = `ID: ${id}, Category: ${category}`;
            if (id === 'serviceworker-fetch') {
                expect(status, description).toEqual('loaded');
            } else {
                expect(status, description).not.toEqual('loaded');
            }
        }
    });

    test('Blocking should not run on localhost', async ({ page, backgroundPage, context, manifestVersion, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'serviceworker-blocking.json');
        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);
        // On MV3 config rules are only created some time after the config is loaded. We can query
        // declarativeNetRequest rules periodically until we see the expected rule.
        if (manifestVersion === 3) {
            while (true) {
                const localhostRules = await backgroundPage.evaluate(async () => {
                    const rules = await chrome.declarativeNetRequest.getDynamicRules();
                    return rules.filter((r) => r.condition.requestDomains?.includes('localhost'));
                });
                if (localhostRules.length > 0) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        const { pageResults } = await runRequestBlockingTest(page, `${TEST_SERVER_ORIGIN}/privacy-protections/request-blocking/`, {
            backgroundPage,
        });
        await page.bringToFront();
        for (const { id, category, status } of pageResults) {
            // skip some flakey request types
            if (['video', 'websocket'].includes(id)) {
                continue;
            }
            const description = `ID: ${id}, Category: ${category}`;
            expect(status, description).toEqual('loaded');
        }
    });

    test('protection toggle disables blocking', async ({ page, backgroundPage, context, manifestVersion, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'serviceworker-blocking.json');
        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            await forDynamicDNRRulesLoaded(backgroundPage);
        }

        // load with protection enabled
        let { pageResults } = await runRequestBlockingTest(page, testSite, { backgroundPage });
        // Verify that no logged requests were allowed.
        for (const { id, category, status } of pageResults) {
            if (isFirefox() && id === 'font') {
                continue;
            }
            const description = `ID: ${id}, Category: ${category}`;
            expect(status, description).not.toEqual('loaded');
        }

        // disable protection on the page and rerun the test
        await backgroundPage.evaluate(async (domain) => {
            /* global dbg */
            dbg.tabManager.setList({ list: 'allowlisted', domain, value: true });
        }, testHost);
        ({ pageResults } = await runRequestBlockingTest(page, testSite, { backgroundPage }));
        for (const { id, category, status } of pageResults) {
            // skip some flakey request types
            if (['video', 'websocket'].includes(id)) {
                continue;
            }
            // serviceworker-fetch: allowlist does not work in MV3
            // https://app.asana.com/0/892838074342800/1204515863331825/f
            if (manifestVersion === 3 && id === 'serviceworker-fetch') {
                continue;
            }
            const description = `ID: ${id}, Category: ${category}`;
            expect(status, description).toEqual('loaded');
        }
    });
});

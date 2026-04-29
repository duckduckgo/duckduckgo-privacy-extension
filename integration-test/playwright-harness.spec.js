/**
 * Tests for the Playwright test harness itself.
 */

import { test, expect } from './helpers/playwrightHarness.js';
import backgroundWait from './helpers/backgroundWait';
import { logPageRequests } from './helpers/requests';
import { routeFromLocalhost } from './helpers/testPages.js';
import { overridePrivacyConfig, overridePrivacyConfigFromContent, overrideTds } from './helpers/testConfig';

test.describe('Background script eval', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context);
    });

    test('evaluates a simple expression', async ({ backgroundPage }) => {
        expect(await backgroundPage.evaluate(() => 2 + 3)).toBe(5);
    });

    test('passes string arguments', async ({ backgroundPage }) => {
        const greeting = await backgroundPage.evaluate((name) => 'Hello, ' + name, 'world');
        expect(greeting).toBe('Hello, world');
    });

    test('passes object arguments', async ({ backgroundPage }) => {
        const sum = await backgroundPage.evaluate(({ a, b }) => a + b, { a: 2, b: 3 });
        expect(sum).toBe(5);
    });

    test('passes large object arguments', async ({ backgroundPage }) => {
        const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: 'x'.repeat(80) }));
        const result = await backgroundPage.evaluate(
            (received) => ({
                count: received.length,
                first: received[0],
                last: received[received.length - 1],
            }),
            items,
        );
        expect(result.count).toBe(100);
        expect(result.first).toEqual({ id: 0, name: 'x'.repeat(80) });
        expect(result.last).toEqual({ id: 99, name: 'x'.repeat(80) });
    });

    test('returns objects', async ({ backgroundPage }) => {
        const obj = await backgroundPage.evaluate(() => ({ foo: 'bar', num: 42, bool: true }));
        expect(obj).toEqual({ foo: 'bar', num: 42, bool: true });
    });

    test('returns arrays', async ({ backgroundPage }) => {
        const arr = await backgroundPage.evaluate(() => [1, 2, 3, 'four']);
        expect(arr).toEqual([1, 2, 3, 'four']);
    });

    test('can read the extension manifest', async ({ backgroundPage }) => {
        const name = await backgroundPage.evaluate(() => chrome.runtime.getManifest().name);
        expect(name).toMatch(/^DuckDuckGo/);
    });
});

async function testLogPageRequests(page, networkContext, backgroundPage, expectedRequests) {
    const targets = new Set(expectedRequests.map((r) => r.url));
    const actualRequests = [];
    const cleanup = await logPageRequests(backgroundPage, networkContext, actualRequests, (r) => targets.has(r.url.href));

    await page.evaluate((urls) => Promise.allSettled(urls.map((u) => fetch(u))), Array.from(targets));

    await expect.poll(() => actualRequests.length, { timeout: 10000 }).toEqual(expectedRequests.length);
    expect(actualRequests.map((r) => ({ ...r, url: r.url.href }))).toEqual(expect.arrayContaining(expectedRequests));

    await cleanup();
}

test.describe('Request logging', () => {
    const expectedRequests = [
        { url: 'http://localhost:3000/?allow', method: 'GET', type: 'fetch', status: 'allowed' },
        { url: 'https://bad.third-party.site/?block', method: 'GET', type: 'fetch', status: 'blocked', reason: expect.any(String) },
        {
            url: 'http://localhost:3000/network-error/drop?fail',
            method: 'GET',
            type: 'fetch',
            status: 'failed',
            reason: expect.any(String),
        },
    ];

    test.beforeEach(async ({ context, backgroundPage }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
    });

    test('page-initiated requests', async ({ page, backgroundPage }) => {
        await routeFromLocalhost(page);
        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await testLogPageRequests(page, page, backgroundPage, expectedRequests);
    });

    test('extension-initiated requests', async ({ backgroundPage, backgroundNetworkContext }) => {
        await testLogPageRequests(
            backgroundPage,
            backgroundNetworkContext,
            backgroundPage,
            // Note: Skip 'blocked' here since the extension doesn't always
            //       block its own background-initiated requests.
            expectedRequests.filter((r) => r.status !== 'blocked'),
        );
    });
});

test.describe('Configuration overrides', () => {
    test('can override privacy config with file', async ({ context, backgroundPage, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'fingerprint-protection.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const fingerprintingState = await backgroundPage.evaluate(() => {
            return globalThis.components?.tds?.config?.data?.features?.fingerprintingCanvas?.state;
        });
        expect(fingerprintingState).toBe('enabled');
    });

    test('can override privacy config with Object', async ({ context, backgroundPage, backgroundNetworkContext }) => {
        const customConfig = {
            version: Date.now(),
            readme: 'Test config',
            features: {
                testFeature: {
                    state: 'enabled',
                    settings: {
                        testSetting: 'testValue',
                    },
                },
            },
            unprotectedTemporary: [],
        };

        await overridePrivacyConfigFromContent(backgroundNetworkContext, customConfig);
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const testFeature = await backgroundPage.evaluate(() => {
            return globalThis.components?.tds?.config?.data?.features?.testFeature;
        });
        expect(testFeature).toBeDefined();
        expect(testFeature.state).toBe('enabled');
        expect(testFeature.settings.testSetting).toBe('testValue');
    });

    test('can override TDS from file', async ({ context, backgroundPage, backgroundNetworkContext }) => {
        await overrideTds(backgroundNetworkContext, 'mock-tds.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);

        const hasTestTracker = await backgroundPage.evaluate(() => {
            const tds = globalThis.components?.tds?.tds?.data;
            return tds?.trackers?.['bad.third-party.site']?.domain === 'bad.third-party.site';
        });
        expect(hasTestTracker).toBe(true);
    });
});

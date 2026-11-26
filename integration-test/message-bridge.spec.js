import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';
import { serviceWorkerControl } from './helpers/serviceWorker';

// aiChat is enabled on duckduckgo.com by the config override and the background's MESSAGE_BRIDGE_DOMAINS.
const PAGE_URL = 'https://duckduckgo.com/message-bridge-test';

test.describe('Message bridge', () => {
    test.beforeEach(async ({ backgroundNetworkContext, backgroundPage, context, page }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'message-bridge.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await backgroundPage.evaluate(() => globalThis.components.scriptInjection.ready);
        await page.route(PAGE_URL, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>bridge</title>' }));
        await page.goto(PAGE_URL);
        // The bridge installs once both the main-world and isolated-world scripts have initialised.
        await page.waitForFunction(() => {
            try {
                return Boolean(navigator.duckduckgo.createMessageBridge('aiChat'));
            } catch {
                return false;
            }
        });
    });

    test('answers a request from the page', async ({ page }) => {
        const result = await page.evaluate(() => navigator.duckduckgo.createMessageBridge('aiChat').request('getAIChatNativeConfigValues'));
        expect(result).toEqual(expect.objectContaining({ platform: 'windows' }));
    });

    test('delivers a push to the page after the service worker restarts', async ({ page, backgroundPage }) => {
        await page.evaluate(() => {
            navigator.duckduckgo.createMessageBridge('aiChat').subscribe('testPush', (params) => {
                window.received = params;
            });
        });
        const serviceWorker = await serviceWorkerControl(page, backgroundPage);
        await serviceWorker.stop();
        await serviceWorker.start();

        await backgroundPage.evaluate(() => globalThis.components.injectedMessaging.push('aiChat', 'testPush', { hello: 'world' }));
        await expect.poll(() => page.evaluate(() => window.received)).toEqual({ hello: 'world' });
    });
});

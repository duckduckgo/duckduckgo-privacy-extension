import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';

const FORM_URL = 'https://internalapps.duckduckgo.com/internal-feedback/';

// Asks for the device info and attachments as the page starts, as the internal feedback form does.
const FORM_PAGE = `<!doctype html>
<html><head><script>
window.formAnswers = (async () => {
    const bridge = navigator.duckduckgo.createMessageBridge('internalFeedback');
    const [deviceInfo, attachments] = await Promise.all([bridge.request('getDeviceInfo'), bridge.request('getAttachments')]);
    return { deviceInfo, attachments };
})().catch((e) => ({ error: e.message }));
</script></head><body></body></html>`;

/**
 * @param {import('@playwright/test').Page} page
 */
async function openForm(page) {
    await page.route(FORM_URL, (route) => route.fulfill({ contentType: 'text/html', body: FORM_PAGE }));
    await page.goto(FORM_URL);
    return page.evaluate(() => window.formAnswers);
}

/**
 * Stands in for the browser's chrome.ddg API, which only the browser bundling the extension provides.
 * @param {import('@playwright/test').Page | import('@playwright/test').Worker} backgroundPage
 */
async function stubBrowser(backgroundPage) {
    await backgroundPage.evaluate(() => {
        globalThis.chrome.ddg = {
            getInternalFeedbackDeviceInfo: async () => ({ platform: 'test' }),
            getInternalFeedbackAttachments: async () => ({ screenshot: 'test' }),
        };
    });
}

/**
 * Stops the extension's service worker, so the next message from a page has to start it again.
 * @param {import('@playwright/test').BrowserContext} context
 */
async function stopServiceWorker(context) {
    const internals = await context.newPage();
    await internals.goto('chrome://serviceworker-internals/');
    const worker = internals.locator('.serviceworker-registration', { hasText: 'chrome-extension://' });
    await worker.locator('cr-button[data-command="stop"]').click();
    await expect(worker.locator('.serviceworker-running-status .value')).toHaveText('STOPPED');
    await internals.close();
}

test.describe('internal feedback form', () => {
    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'internal-feedback.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await backgroundPage.evaluate(() => globalThis.components.scriptInjection.ready);
    });

    test('gets answers to requests made as the page starts', async ({ backgroundPage, page }) => {
        await stubBrowser(backgroundPage);
        expect(await openForm(page)).toEqual({ deviceInfo: { platform: 'test' }, attachments: { screenshot: 'test' } });
    });

    test('gets answers when the service worker has to start first', async ({ context, page }) => {
        await stopServiceWorker(context);
        // The restarted service worker has no stub, so the answers are the fallbacks of a browser without chrome.ddg.
        expect(await openForm(page)).toEqual({ deviceInfo: null, attachments: {} });
    });
});

test.describe('internal feedback form without the remote config', () => {
    test('gets no data when the remote config does not enable the form', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await backgroundPage.evaluate(() => globalThis.components.scriptInjection.ready);
        await stubBrowser(backgroundPage);
        expect(await openForm(page)).toEqual({ deviceInfo: null, attachments: {} });
    });
});

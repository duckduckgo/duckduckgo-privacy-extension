const path = require('path');

const { chromium } = require('@playwright/test');
const { launchExtensionBackground } = require('firefox-webext-playwright-harness');

const STUB_EXT_PATH = path.join(__dirname, '..', 'data', 'stub-extensions');
const CHROME_STUB_EXT_PATH = path.join(STUB_EXT_PATH, 'chrome-extension');
const FIREFOX_STUB_EXT_PATH = path.join(STUB_EXT_PATH, 'firefox-extension');

/**
 * Get the extension's background ServiceWorker.
 * @see https://playwright.dev/docs/service-workers
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @return {Promise<import('@playwright/test').Page | import('@playwright/test').Worker>}
 */
async function getBackgroundServiceWorker(context) {
    let [serviceWorker] = context.serviceWorkers();

    if (!serviceWorker) {
        try {
            serviceWorker = await context.waitForEvent('serviceworker', { timeout: 2000 });
        } catch {
            [serviceWorker] = context.serviceWorkers();
        }
    }

    if (!serviceWorker) {
        throw new Error("Failed to find extension's background ServiceWorker.");
    }

    return serviceWorker;
}

/**
 * Launch a browser with a stub extension loaded, and return the extension's
 * background context.
 *
 * Note: This is a lightweight wrapper that's designed for unit tests. Suitable
 *       for tests that only need to evaluate code in an extension's background
 *       context.
 * @param {('chrome'|'firefox')} platform
 * @return {Promise<{
 *   background: import('@playwright/test').Page | import('@playwright/test').Worker,
 *   close: () => Promise<void>
 * }>}
 */
async function launchSimpleExtensionContext(platform) {
    if (platform === 'chrome') {
        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium',
            args: [`--disable-extensions-except=${CHROME_STUB_EXT_PATH}`, `--load-extension=${CHROME_STUB_EXT_PATH}`],
        });

        const background = await getBackgroundServiceWorker(context);
        return { background, close: () => context.close() };
    }

    if (platform === 'firefox') {
        return launchExtensionBackground({
            extensionPath: FIREFOX_STUB_EXT_PATH,
            firefoxUserPrefs: { 'extensions.dnr.feedback': true },
        });
    }

    throw new Error('Unknown platform "' + platform + '"');
}

exports.getBackgroundServiceWorker = getBackgroundServiceWorker;
exports.launchSimpleExtensionContext = launchSimpleExtensionContext;

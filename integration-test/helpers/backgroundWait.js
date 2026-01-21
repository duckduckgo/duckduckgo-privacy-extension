import { isFirefoxTest } from './playwrightHarness';

/**
 * Wait for a function to return a truthy value in the background page.
 * Works with both Playwright's native Page/Worker and our FirefoxBackgroundPage.
 *
 * @param {import('@playwright/test').Page | import('@playwright/test').Worker} bgPage
 * @param {Function} func - Function to evaluate
 * @param {*} [arg] - Optional argument to pass to the function
 * @returns {Promise<any>}
 */
export function forFunction(bgPage, func, arg) {
    // Both Playwright and our FirefoxBackgroundPage now have compatible waitForFunction signatures
    return bgPage.waitForFunction(func, arg, { polling: 100, timeout: 15000 });
}

export async function forSetting(bgPage, key) {
    return await forFunction(bgPage, (pageKey) => globalThis.dbg?.settings?.getSetting(pageKey), key);
}

export async function forAllConfiguration(bgPage) {
    await forFunction(bgPage, async () => {
        if (
            !globalThis.dbg?.https?.isReady ||
            !globalThis.dbg?.settings?.ready ||
            !globalThis.dbg?.startup?.ready ||
            !globalThis.dbg?.tds?.ready
        ) {
            return false;
        }

        await Promise.all([globalThis.dbg.settings.ready(), globalThis.dbg.startup.ready(), globalThis.dbg.tds.ready()]);

        return true;
    });
}

/**
 * @param {import('@playwright/test').BrowserContext} context
 */
export async function forExtensionLoaded(context) {
    // For Firefox, the extension is installed via RDP and doesn't open the post-install page automatically.
    // The extension is already loaded by the time the context fixture completes, so we can skip this wait.
    if (isFirefoxTest()) {
        // Wait a bit for the extension to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
    }

    return /** @type {Promise<string>} */ (
        new Promise((resolve) => {
            const postInstallPage = 'https://duckduckgo.com/extension-success';
            const listenForPostinstall = (page) => {
                if (page.url().startsWith(postInstallPage)) {
                    resolve(page.url());
                    context.off('page', listenForPostinstall);
                }
            };
            if (context.pages().find((p) => p.url().startsWith(postInstallPage))) {
                return resolve();
            }
            context.on('page', listenForPostinstall);
        })
    );
}

export async function forDynamicDNRRulesLoaded(backgroundPage) {
    // The 'allLoadingFinished' promise on a ResourceLoader signifies that the resource was loaded
    // at least once, and all subscribed listeners received and processed that resource.
    await backgroundPage.evaluate(async () => {
        await Promise.all([globalThis.components.tds.config.allLoadingFinished, globalThis.components.tds.tds.allLoadingFinished]);
    });
}

export default {
    forSetting,
    forAllConfiguration,
    forExtensionLoaded,
    forDynamicDNRRulesLoaded,
};

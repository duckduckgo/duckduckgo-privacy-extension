import { errors } from '@playwright/test';
import { getBackgroundServiceWorker } from './playwrightHelpers';

// Helpers that aid in waiting for the background page's state.
function manuallyWaitForFunction(bgPage, func, { polling, timeout }, ...args) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const waitForFunction = async () => {
            let result;
            try {
                result = await bgPage.evaluate(func, ...args);
            } catch (e) {
                return reject(e);
            }
            if (result) {
                return resolve(result);
            } else {
                if (Date.now() - startTime > timeout) {
                    return reject(new errors.TimeoutError('Manually waiting for function timed out: ' + func.toString()));
                } else {
                    setTimeout(waitForFunction, polling);
                }
            }
        };
        waitForFunction();
    });
}

/**
 * @param {import('@playwright/test').Page | import('@playwright/test').Worker} bgPage
 * @param {*} func
 * @param  {...any} args
 * @returns {Promise<any>}
 */
export function forFunction(bgPage, func, ...args) {
    if (bgPage.waitForFunction && bgPage.routeFromHAR) {
        // In Playwright, the waitForFunction signature differs from the puppeteer one
        return bgPage.waitForFunction(func, ...args);
    }
    const waitForFunction = manuallyWaitForFunction.bind(null, bgPage);
    return waitForFunction(func, { polling: 10, timeout: 15000 }, ...args);
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
    const firefoxBackgroundPage = /** @type {any} */ (context)._firefoxBgPage;
    if (firefoxBackgroundPage) {
        return firefoxBackgroundPage.evaluate(() => browser.runtime.getURL('/'));
    }

    const serviceWorker = await getBackgroundServiceWorker(context);
    return serviceWorker.url();
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

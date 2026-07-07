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

exports.getBackgroundServiceWorker = getBackgroundServiceWorker;

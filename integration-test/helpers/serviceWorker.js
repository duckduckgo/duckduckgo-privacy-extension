/**
 * Stops and starts the extension's background service worker over CDP, as Chrome's
 * lifecycle does, without any page messaging it. The backgroundPage handle keeps
 * working across restarts.
 * @param {import('@playwright/test').Page} page - any page, for the CDP session
 * @param {import('@playwright/test').Worker} backgroundPage - the service worker
 */
export async function serviceWorkerControl(page, backgroundPage) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    const reachStatus = (status, command) =>
        new Promise((resolve, reject) => {
            const listener = ({ versions }) => {
                if (versions.some((v) => v.runningStatus === status)) {
                    cdp.off('ServiceWorker.workerVersionUpdated', listener);
                    resolve(undefined);
                }
            };
            cdp.on('ServiceWorker.workerVersionUpdated', listener);
            command().catch(reject);
        });
    return {
        stop: () => reachStatus('stopped', () => cdp.send('ServiceWorker.stopAllWorkers')),
        start: () =>
            reachStatus('running', () => cdp.send('ServiceWorker.startWorker', { scopeURL: new URL('/', backgroundPage.url()).href })),
    };
}

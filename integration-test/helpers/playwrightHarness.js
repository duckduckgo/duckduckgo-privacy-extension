import { test as base, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

const testRoot = path.join(__dirname, '..');
const projectRoot = path.join(testRoot, '..');
export function getHARPath(harFile) {
    return path.join(testRoot, 'data', 'har', harFile);
}

export function getManifestVersion() {
    return process.env.npm_lifecycle_event === 'playwright-mv2' ? 2 : 3;
}

/**
 * Add a script tag to a page or frame context.
 *
 * @param {import('@playwright/test').Page | import('@playwright/test').Frame} context
 *   Page or frame to inject script into.
 * @param {{path?: string, content?: string, url?: string}} options
 *   Details of the script to inject.
 */
export async function addScriptTag(context, options) {
    await context.addScriptTag(options);
}

async function routeLocalResources(route) {
    const url = new URL(route.request().url());
    const localPath = path.join(testRoot, 'data', 'staticcdn', url.pathname);
    try {
        const body = await fs.readFile(localPath);
        // console.log('request served from disk', route.request().url())
        route.fulfill({
            status: 200,
            body,
            headers: {
                etag: 'test',
            },
        });
    } catch (e) {
        // console.log('request served from network', route.request().url())
        route.continue();
    }
}

export const mockAtb = {
    majorVersion: 364,
    minorVersion: 2,
    version: 'v364-2',
};

// based off example at https://playwright.dev/docs/chrome-extensions#testing
export const test = base.extend({
    /**
     * @type {2 | 3}
     */
    manifestVersion: getManifestVersion(),
    /**
     * @type {import('@playwright/test').BrowserContext}
     */
    async context({ manifestVersion }, use) {
        const extensionPath = manifestVersion === 3 ? 'build/chrome/dev' : 'build/chrome-mv2/dev';
        const pathToExtension = path.join(projectRoot, extensionPath);
        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium',
            args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
        });
        // intercept extension install page and use HAR
        context.on('page', (page) => {
            // console.log('page', page.url())
            if (page.url().includes('duckduckgo.com/extension-success')) {
                // HAR file generated with the following command:
                // npx playwright open --save-har=data/har/duckduckgo.com/extension-success.har https://duckduckgo.com/extension-success
                page.routeFromHAR(getHARPath('duckduckgo.com/extension-success.har'), {
                    notFound: 'abort',
                }).catch(() => {});
            }
        });
        await use(context);
        await context.close();
    },
    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker}
     */
    async backgroundPage({ context, manifestVersion }, use) {
        // let background: Page | Worker
        const routeHandler = (route) => {
            const url = route.request().url();
            if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                return routeLocalResources(route);
            }
            if (url.startsWith('https://duckduckgo.com/atb.js')) {
                // mock ATB endpoint
                const params = new URL(url).searchParams;
                if (params.has('atb')) {
                    const version = params.get('atb');
                    const [majorVersion, minorVersion] = version.slice(1).split('-');
                    if (majorVersion < 360 && minorVersion > 1) {
                        return route.fulfill({
                            body: JSON.stringify({
                                ...mockAtb,
                                updateVersion: `v${majorVersion}-1`,
                            }),
                        });
                    }
                }
                return route.fulfill({
                    body: JSON.stringify(mockAtb),
                });
            }
            if (url.startsWith('https://duckduckgo.com/exti') || url.startsWith('https://improving.duckduckgo.com/')) {
                return route.fulfill({
                    status: 200,
                    body: '',
                });
            }
            route.continue();
        };

        if (manifestVersion === 3) {
            // See https://playwright.dev/docs/service-workers
            const getBackgroundServiceWorker = async () => {
                let [serviceWorker] = context.serviceWorkers();
                if (!serviceWorker) {
                    try {
                        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 2000 });
                    } catch {
                        [serviceWorker] = context.serviceWorkers();
                    }
                }
                return serviceWorker;
            };

            const restartBackgroundServiceWorker = async () => {
                // There is a race condition, whereby Playwright sometimes
                // fails to attach to the extension's background ServiceWorker,
                // possibly because it was created too early. When that happens,
                // restart the ServiceWorker via CDP to give Playwright another
                // chance to spot it.
                const page = context.pages()[0];
                if (page) {
                    const cdp = await context.newCDPSession(page);
                    try {
                        // Stop the ServiceWorker
                        await cdp.send('ServiceWorker.enable');
                        await cdp.send('ServiceWorker.stopAllWorkers');

                        // Start it again.
                        const newPage = await context.newPage();
                        await newPage.goto('https://duckduckgo.com/extension-success');

                        console.log('Restarted ServiceWorker.');
                    } finally {
                        await cdp.detach().catch(() => {});
                    }
                }
            };

            let background = await getBackgroundServiceWorker();
            if (!background) {
                await restartBackgroundServiceWorker();
                background = await getBackgroundServiceWorker();
            }

            if (!background) {
                throw new Error("Failed to find extension's background ServiceWorker.");
            }

            // Serve extension background requests from local cache
            await context.route('**/*', routeHandler);
            await use(background);
        } else {
            let [background] = context.backgroundPages();
            if (!background) {
                background = await context.waitForEvent('backgroundpage');
            }

            // Serve extension background requests from local cache
            await background.route('**/*', routeHandler);
            await use(background);
        }
    },
    /**
     * wraps the 'route' function in a manifest agnostic way
     * @type {(url: string | RegExp, handler: (route: Route, request: Request) => any) => Promise<void>}
     */
    async routeExtensionRequests({ manifestVersion, backgroundPage, context }, use) {
        if (manifestVersion === 3) {
            await use(context.route.bind(context));
        } else {
            await use(backgroundPage.route.bind(backgroundPage));
        }
    },
    /**
     * Use this for listening and modifying network events for both MV2 and MV3
     * @type {import('@playwright/test').Page | import('@playwright/test').BrowserContext}
     */
    async backgroundNetworkContext({ manifestVersion, backgroundPage, context }, use) {
        if (manifestVersion === 3) {
            await use(context);
        } else {
            await use(backgroundPage);
        }
    },
});

export const expect = test.expect;

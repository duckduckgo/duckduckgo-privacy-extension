import { test as base, chromium, firefox } from '@playwright/test';
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

export function getBrowserType() {
    return process.env.npm_lifecycle_event === 'playwright-mv2' ? 'firefox' : 'chrome';
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
     * @type {'chrome' | 'firefox'}
     */
    browserType: getBrowserType(),
    /**
     * @type {import('@playwright/test').BrowserContext}
     */
    async context({ manifestVersion, browserType }, use) {
        let extensionPath;
        let browser;
        
        if (browserType === 'firefox') {
            // For MV2 tests, we'll use Firefox browser but note that we can't load the extension directly
            // due to Playwright limitations. Tests will need to be adapted accordingly.
            browser = firefox;
        } else {
            extensionPath = manifestVersion === 3 ? 'build/chrome/dev' : 'build/chrome-mv2/dev';
            browser = chromium;
        }
        
        if (browserType === 'firefox') {
            // For Firefox, we'll launch without extension loading since Playwright doesn't support it
            const context = await browser.launchPersistentContext('', {
                headless: false,
            });
            
            // intercept extension install page and use HAR
            context.on('page', (page) => {
                // console.log('page', page.url())
                if (page.url().includes('duckduckgo.com/extension-success')) {
                    // HAR file generated with the following command:
                    // npx playwright open --save-har=data/har/duckduckgo.com/extension-success.har https://duckduckgo.com/extension-success
                    page.routeFromHAR(getHARPath('duckduckgo.com/extension-success.har'), {
                        notFound: 'abort',
                    });
                }
            });
            
            await use(context);
        } else {
            // Chrome extension loading (existing logic)
            const pathToExtension = path.join(projectRoot, extensionPath);
            const context = await browser.launchPersistentContext('', {
                headless: false,
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
                    });
                }
            });
            //
            await use(context);
        }
    },
    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker}
     */
    async backgroundPage({ context, manifestVersion, browserType }, use) {
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
        
        if (browserType === 'firefox') {
            // For Firefox browser, we'll use the main context for routing
            // since we can't access the extension's background page directly
            context.route('**/*', routeHandler);
            await use(context);
        } else if (manifestVersion === 3) {
            let [background] = context.serviceWorkers();
            if (!background) background = await context.waitForEvent('serviceworker');
            // SW request routing is experimental: https://playwright.dev/docs/service-workers-experimental
            context.route('**/*', routeHandler);
            await use(background);
        } else {
            let [background] = context.backgroundPages();
            if (!background) {
                background = await context.waitForEvent('backgroundpage');
            }

            // Serve extension background requests from local cache
            background.route('**/*', routeHandler);
            await use(background);
        }
    },
    /**
     * wraps the 'route' function in a manifest agnostic way
     * @type {(url: string | RegExp, handler: (route: Route, request: Request) => any) => Promise<void>}
     */
    async routeExtensionRequests({ manifestVersion, backgroundPage, context, browserType }, use) {
        if (browserType === 'firefox') {
            await use(context.route.bind(context));
        } else if (manifestVersion === 3) {
            await use(context.route.bind(context));
        } else {
            await use(backgroundPage.route.bind(backgroundPage));
        }
    },
    /**
     * Use this for listening and modifying network events for both MV2 and MV3
     * @type {import('@playwright/test').Page | import('@playwright/test').BrowserContext}
     */
    async backgroundNetworkContext({ manifestVersion, backgroundPage, context, browserType }, use) {
        if (browserType === 'firefox') {
            await use(context);
        } else if (manifestVersion === 3) {
            await use(context);
        } else {
            await use(backgroundPage);
        }
    },
});

export const expect = test.expect;

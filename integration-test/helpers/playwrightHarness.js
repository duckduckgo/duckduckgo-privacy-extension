import { test as base, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

// Firefox-specific imports (only used when running Firefox tests)
import { findFreePort, createFirefoxContext, cleanupFirefoxContext, FirefoxBackgroundPage } from './firefoxHarness.js';

const testRoot = path.join(__dirname, '..');
const projectRoot = path.join(testRoot, '..');

export function getHARPath(harFile) {
    return path.join(testRoot, 'data', 'har', harFile);
}

/**
 * Check if we're running Firefox tests
 */
export function isFirefoxTest() {
    return (
        process.env.npm_lifecycle_event === 'playwright-firefox' ||
        process.env.PWTEST_FIREFOX === '1' ||
        process.argv.some((arg) => arg.includes('playwright.firefox.config'))
    );
}

export function getManifestVersion() {
    // Firefox always uses MV2
    if (isFirefoxTest()) {
        return 2;
    }
    return process.env.npm_lifecycle_event === 'playwright-mv2' ? 2 : 3;
}

async function routeLocalResources(route) {
    const url = new URL(route.request().url());
    const localPath = path.join(testRoot, 'data', 'staticcdn', url.pathname);
    try {
        const body = await fs.readFile(localPath);
        route.fulfill({
            status: 200,
            body,
            headers: {
                etag: 'test',
            },
        });
    } catch (e) {
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
     * RDP port for Firefox debugging (only used for Firefox tests)
     * @type {number}
     */
    rdpPort: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            if (isFirefoxTest()) {
                const port = await findFreePort();
                await use(port);
            } else {
                await use(0);
            }
        },
        { scope: 'worker' },
    ],

    /**
     * @type {import('@playwright/test').BrowserContext}
     */
    async context({ manifestVersion, rdpPort }, use, testInfo) {
        let context;

        if (isFirefoxTest()) {
            // Firefox extension testing via RDP
            const extensionPath = path.join(projectRoot, 'build/firefox/dev');
            const addonId = 'jid1-ZAdIEUB7XOzOJw@jetpack';

            const { context: firefoxContext } = await createFirefoxContext(rdpPort, extensionPath, addonId);
            context = firefoxContext;

            // Set up routes for staticcdn and ATB
            await context.route('**/*', async (route) => {
                const url = route.request().url();
                if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                    return routeLocalResources(route);
                }
                if (url.startsWith('https://duckduckgo.com/atb.js')) {
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
                    return route.fulfill({ status: 200, body: '' });
                }
                route.continue();
            });

            console.log(`Installed Firefox extension: ${addonId}`);
        } else {
            // Chrome extension testing (existing logic)
            const extensionPath = manifestVersion === 3 ? 'build/chrome/dev' : 'build/chrome-mv2/dev';
            const pathToExtension = path.join(projectRoot, extensionPath);
            context = await chromium.launchPersistentContext('', {
                headless: false,
                args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
            });
        }

        // Intercept extension install page and use HAR
        context.on('page', (page) => {
            if (page.url().includes('duckduckgo.com/extension-success')) {
                page.routeFromHAR(getHARPath('duckduckgo.com/extension-success.har'), {
                    notFound: 'abort',
                });
            }
        });

        await use(context);

        // Cleanup for Firefox
        if (isFirefoxTest()) {
            await cleanupFirefoxContext(context);
        }
    },

    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker | FirefoxBackgroundPage | null}
     */
    async backgroundPage({ context, manifestVersion }, use) {
        const routeHandler = (route) => {
            const url = route.request().url();
            if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                return routeLocalResources(route);
            }
            if (url.startsWith('https://duckduckgo.com/atb.js')) {
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
                return route.fulfill({ status: 200, body: '' });
            }
            route.continue();
        };

        if (isFirefoxTest()) {
            // Firefox: Create background page wrapper with evaluate() support
            const firefoxBg = new FirefoxBackgroundPage(
                context._rdpClient,
                context._firefoxBackgroundConsoleActor,
                context._firefoxEvalResults,
            );
            await use(firefoxBg);
        } else if (manifestVersion === 3) {
            let [background] = context.serviceWorkers();
            if (!background) background = await context.waitForEvent('serviceworker');
            context.route('**/*', routeHandler);
            await use(background);
        } else {
            let [background] = context.backgroundPages();
            if (!background) {
                background = await context.waitForEvent('backgroundpage');
            }
            background.route('**/*', routeHandler);
            await use(background);
        }
    },

    /**
     * wraps the 'route' function in a manifest agnostic way
     * @type {(url: string | RegExp, handler: (route: Route, request: Request) => any) => Promise<void>}
     */
    async routeExtensionRequests({ manifestVersion, backgroundPage, context }, use) {
        if (isFirefoxTest() || manifestVersion === 3) {
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
        if (isFirefoxTest() || manifestVersion === 3) {
            await use(context);
        } else {
            await use(backgroundPage);
        }
    },
});

export const expect = test.expect;

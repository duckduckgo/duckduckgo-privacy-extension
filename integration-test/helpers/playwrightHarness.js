import { test as base, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

import { findFreePort, createFirefoxContext, cleanupFirefoxContext, FirefoxBackgroundPage } from './firefoxHarness.js';

const testRoot = path.join(__dirname, '..');
const projectRoot = path.join(testRoot, '..');
export function getHARPath(harFile) {
    return path.join(testRoot, 'data', 'har', harFile);
}

export function isFirefox() {
    return process.env.npm_lifecycle_event === 'playwright-firefox';
}

export function getManifestVersion() {
    return process.env.npm_lifecycle_event === 'playwright' ? 3 : 2;
}

/**
 * Add a script tag to a page or frame context.
 * On Firefox, uses evaluate() to inject the script content directly to bypass CSP restrictions.
 * On Chrome, uses the native addScriptTag() method.
 *
 * @param {import('@playwright/test').Page | import('@playwright/test').Frame} context - Page or frame to inject script into
 * @param {Object} options - Script options
 * @param {string} [options.path] - Path to the script file
 * @param {string} [options.content] - Script content to inject
 * @param {string} [options.url] - URL to load script from
 */
export async function addScriptTag(context, options) {
    if (isFirefox()) {
        // Firefox: Use evaluate() to inject script content directly to bypass CSP
        let scriptContent;
        if (options.path) {
            scriptContent = await fs.readFile(options.path, 'utf8');
        } else if (options.content) {
            scriptContent = options.content;
        } else if (options.url) {
            // For URL-based scripts, we need to fetch and inject
            scriptContent = await context.evaluate(async (scriptUrl) => {
                const response = await fetch(scriptUrl);
                return response.text();
            }, options.url);
        } else {
            throw new Error('addScriptTag requires path, content, or url option');
        }

        await context.evaluate((code) => {
            const script = document.createElement('script');
            script.textContent = code;
            document.head.appendChild(script);
        }, scriptContent);
    } else {
        // Chrome: Use native addScriptTag
        await context.addScriptTag(options);
    }
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

function routeHandler(route) {
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
}

// based off example at https://playwright.dev/docs/chrome-extensions#testing
export const test = base.extend({
    /**
     * @type {2 | 3}
     */
    manifestVersion: getManifestVersion(),

    /**
     * RDP port for Firefox debugging (only used for Firefox tests)
     * Each test gets a fresh port to ensure complete isolation.
     * @type {number}
     */
    rdpPort: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            if (isFirefox()) {
                const port = await findFreePort();
                await use(port);
            } else {
                await use(0);
            }
        },
        { scope: 'test' },
    ],

    /**
     * @type {import('@playwright/test').BrowserContext}
     */
    async context({ manifestVersion, rdpPort }, use, testInfo) {
        let context;

        if (isFirefox()) {
            // Firefox extension testing via RDP
            const extensionPath = path.join(projectRoot, 'build/firefox/dev');
            const addonId = 'jid1-ZAdIEUB7XOzOJw@jetpack';

            const { context: firefoxContext } = await createFirefoxContext(rdpPort, extensionPath, addonId);
            context = firefoxContext;

            await context.route('**/*', routeHandler);

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

        if (isFirefox()) {
            await cleanupFirefoxContext(context);
        }
    },
    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker | FirefoxBackgroundPage | null}
     */
    async backgroundPage({ context, manifestVersion }, use) {
        if (isFirefox()) {
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
    async routeExtensionRequests({ manifestVersion, backgroundPage, context }, use) {
        if (isFirefox() || manifestVersion === 3) {
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
        if (isFirefox() || manifestVersion === 3) {
            await use(context);
        } else {
            await use(backgroundPage);
        }
    },
});

export const expect = test.expect;

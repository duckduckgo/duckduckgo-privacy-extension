import { test as base, chromium, firefox } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import net from 'net';
import os from 'os';

const testRoot = path.join(__dirname, '..');
const projectRoot = path.join(testRoot, '..');

export function getHARPath(harFile) {
    return path.join(testRoot, 'data', 'har', harFile);
}

/**
 * Check if we're running Firefox tests
 */
export function isFirefoxTest() {
    return process.env.npm_lifecycle_event === 'playwright-firefox';
}

export function getManifestVersion() {
    // Firefox always uses MV2
    if (isFirefoxTest()) {
        return 2;
    }
    return process.env.npm_lifecycle_event === 'playwright-mv2' ? 2 : 3;
}

/**
 * Find an available TCP port (for Firefox RDP)
 */
async function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

/**
 * Simple RDP client for Firefox extension installation.
 * Based on web-ext's RDP client implementation.
 */
class FirefoxRDPClient {
    constructor() {
        this._incoming = Buffer.alloc(0);
        this._pending = [];
        this._active = new Map();
        this._conn = null;
    }

    async connect(port, maxRetries = 50, retryInterval = 100) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await this._tryConnect(port);
                return;
            } catch (err) {
                if (err.code === 'ECONNREFUSED' && i < maxRetries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, retryInterval));
                } else {
                    throw err;
                }
            }
        }
    }

    _tryConnect(port) {
        return new Promise((resolve, reject) => {
            const conn = net.createConnection({ port, host: '127.0.0.1' });
            this._conn = conn;

            conn.on('data', (data) => this._onData(data));
            conn.on('error', reject);

            // Wait for the initial root message
            this._expectReply('root', { resolve, reject });
        });
    }

    disconnect() {
        if (this._conn) {
            this._conn.end();
            this._conn = null;
        }
    }

    async request(requestProps) {
        const request = typeof requestProps === 'string' ? { to: 'root', type: requestProps } : requestProps;

        if (!request.to) {
            throw new Error(`RDP request without target actor: ${request.type}`);
        }

        return new Promise((resolve, reject) => {
            const deferred = { resolve, reject };
            this._pending.push({ request, deferred });
            this._flushPendingRequests();
        });
    }

    _flushPendingRequests() {
        this._pending = this._pending.filter(({ request, deferred }) => {
            if (this._active.has(request.to)) {
                return true; // Keep pending
            }

            try {
                const str = JSON.stringify(request);
                const msg = `${Buffer.from(str).length}:${str}`;
                this._conn.write(msg);
                this._expectReply(request.to, deferred);
            } catch (err) {
                deferred.reject(err);
            }

            return false;
        });
    }

    _expectReply(targetActor, deferred) {
        this._active.set(targetActor, deferred);
    }

    _parseMessage() {
        const str = this._incoming.toString();
        const sepIdx = str.indexOf(':');
        if (sepIdx < 1) return null;

        const byteLen = parseInt(str.slice(0, sepIdx));
        if (isNaN(byteLen)) return null;

        const dataStart = sepIdx + 1;
        if (this._incoming.length - dataStart < byteLen) return null;

        const msg = this._incoming.slice(dataStart, dataStart + byteLen);
        this._incoming = this._incoming.slice(dataStart + byteLen);

        try {
            return JSON.parse(msg.toString());
        } catch (e) {
            return null;
        }
    }

    _onData(data) {
        this._incoming = Buffer.concat([this._incoming, data]);

        let msg;
        while ((msg = this._parseMessage())) {
            if (msg.from && this._active.has(msg.from)) {
                const deferred = this._active.get(msg.from);
                this._active.delete(msg.from);

                if (msg.error) {
                    deferred.reject(msg);
                } else {
                    deferred.resolve(msg);
                }

                this._flushPendingRequests();
            }
        }
    }
}

/**
 * Install a temporary extension in Firefox via RDP
 */
async function installExtensionViaRDP(rdpPort, extensionPath) {
    const client = new FirefoxRDPClient();
    await client.connect(rdpPort);

    try {
        // Get the addons actor
        const rootInfo = await client.request('getRoot');
        const addonsActor = rootInfo.addonsActor;

        if (!addonsActor) {
            throw new Error('Firefox does not provide an addons actor');
        }

        // Install the temporary addon
        const result = await client.request({
            to: addonsActor,
            type: 'installTemporaryAddon',
            addonPath: extensionPath,
        });

        return { addon: result.addon, client };
    } catch (err) {
        client.disconnect();
        throw err;
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
     * RDP client for Firefox (only used for Firefox tests)
     * @type {FirefoxRDPClient | null}
     */
    _rdpClient: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use(null);
        },
        { scope: 'worker' },
    ],

    /**
     * @type {import('@playwright/test').BrowserContext}
     */
    async context({ manifestVersion, rdpPort }, use, testInfo) {
        let context;
        let rdpClient = null;

        if (isFirefoxTest()) {
            // Firefox extension testing
            const extensionPath = path.join(projectRoot, 'build/firefox/dev');
            const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firefox-test-'));

            context = await firefox.launchPersistentContext(userDataDir, {
                headless: false,
                firefoxUserPrefs: {
                    // Allow unsigned extensions
                    'xpinstall.signatures.required': false,
                    'extensions.autoDisableScopes': 0,
                    'extensions.enabledScopes': 15,
                    // Enable remote debugging for extension installation
                    'devtools.debugger.remote-enabled': true,
                    'devtools.debugger.prompt-connection': false,
                },
                args: [`-start-debugger-server=${rdpPort}`],
            });

            // Wait for Firefox to be ready
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Install the extension via RDP
            try {
                const result = await installExtensionViaRDP(rdpPort, extensionPath);
                rdpClient = result.client;
                console.log(`Installed Firefox extension: ${result.addon.id}`);
            } catch (err) {
                console.error('Failed to install Firefox extension:', err);
                await context.close();
                throw err;
            }

            // Wait for extension to initialize
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Store cleanup info
            context._firefoxUserDataDir = userDataDir;
            context._rdpClient = rdpClient;
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
        if (context._rdpClient) {
            context._rdpClient.disconnect();
        }
        if (context._firefoxUserDataDir) {
            await fs.rm(context._firefoxUserDataDir, { recursive: true, force: true });
        }
    },
    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker | null}
     */
    async backgroundPage({ context, manifestVersion }, use) {
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

        if (isFirefoxTest()) {
            // Firefox: Set up context-level routing since we can't access background pages directly
            // Note: Playwright's Firefox doesn't expose extension background pages
            await context.route('**/*', routeHandler);
            // Return null - tests that need backgroundPage.evaluate() will need Firefox-specific handling
            await use(null);
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
        if (isFirefoxTest() || manifestVersion === 3) {
            // Firefox and MV3 use context-level routing
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
            // Firefox and MV3 use context-level routing
            await use(context);
        } else {
            await use(backgroundPage);
        }
    },
});

export const expect = test.expect;

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
 * Simple RDP client for Firefox extension installation and debugging.
 * Based on web-ext's RDP client implementation.
 */
class FirefoxRDPClient {
    constructor() {
        this._incoming = Buffer.alloc(0);
        this._pending = [];
        this._active = new Map();
        this._conn = null;
        this._eventHandlers = [];
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
        this._eventHandlers = [];
    }

    /**
     * Register an event handler for unsolicited messages
     */
    onEvent(handler) {
        this._eventHandlers.push(handler);
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
            } else {
                // Unsolicited event - notify handlers
                this._eventHandlers.forEach((h) => h(msg));
            }
        }
    }
}

/**
 * Install a temporary extension in Firefox via RDP and get background page access
 */
async function installExtensionViaRDP(rdpPort, extensionPath, addonId) {
    const client = new FirefoxRDPClient();

    // Set up event handlers for eval results
    const evalResults = new Map();
    client.onEvent((msg) => {
        if (msg.type === 'evaluationResult') {
            evalResults.set(msg.resultID, msg);
        }
    });

    await client.connect(rdpPort);

    try {
        // Get the addons actor
        const rootInfo = await client.request('getRoot');
        const addonsActor = rootInfo.addonsActor;

        if (!addonsActor) {
            throw new Error('Firefox does not provide an addons actor');
        }

        // Install the temporary addon
        const installResult = await client.request({
            to: addonsActor,
            type: 'installTemporaryAddon',
            addonPath: extensionPath,
        });

        // Wait for extension to initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Get the addon's actor from listAddons
        const addonsResponse = await client.request('listAddons');
        const ourAddon = addonsResponse.addons.find((a) => a.id === addonId);

        if (!ourAddon) {
            throw new Error(`Could not find addon ${addonId} in listAddons`);
        }

        // Get watcher for the addon
        const watcherResult = await client.request({
            to: ourAddon.actor,
            type: 'getWatcher',
        });

        // Watch frame targets first (required before worker targets work)
        await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'frame',
        });

        // Watch worker targets to get the background page
        const workerResult = await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'worker',
        });

        let backgroundConsoleActor = null;
        if (workerResult.target && workerResult.target.url.includes('_generated_background_page')) {
            backgroundConsoleActor = workerResult.target.consoleActor;

            // Start listening for evaluation results
            await client.request({
                to: backgroundConsoleActor,
                type: 'startListeners',
                listeners: ['evaluationResult'],
            });
        }

        return {
            addon: installResult.addon,
            client,
            backgroundConsoleActor,
            evalResults,
        };
    } catch (err) {
        client.disconnect();
        throw err;
    }
}

/**
 * Evaluate code in the Firefox extension's background page via RDP.
 * Uses JSON serialization for proper value transfer.
 */
async function evaluateInFirefoxBackground(client, consoleActor, evalResults, code) {
    if (!consoleActor) {
        throw new Error('No background console actor available - cannot evaluate in background');
    }

    // Wrap code in JSON.stringify to properly serialize the result
    // This handles objects, arrays, and primitives correctly
    const wrappedCode = `
        (function() {
            try {
                const __result__ = (function() { return ${code}; })();
                return JSON.stringify({ __ok__: true, __value__: __result__ });
            } catch (e) {
                return JSON.stringify({ __ok__: false, __error__: e.message, __stack__: e.stack });
            }
        })()
    `;

    const evalRequest = await client.request({
        to: consoleActor,
        type: 'evaluateJSAsync',
        text: wrappedCode,
    });

    // Wait for result (with timeout)
    const timeout = 10000;
    const startTime = Date.now();
    while (!evalResults.has(evalRequest.resultID)) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Timeout waiting for evaluation result`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const result = evalResults.get(evalRequest.resultID);
    evalResults.delete(evalRequest.resultID);

    if (result.hasException) {
        throw new Error(`Evaluation error: ${result.exceptionMessage}`);
    }

    // Parse the JSON result
    const jsonStr = result.result;
    if (typeof jsonStr !== 'string') {
        // Handle case where result is already parsed or undefined
        if (jsonStr && jsonStr.type === 'undefined') {
            return undefined;
        }
        throw new Error(`Unexpected result type: ${typeof jsonStr}`);
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed.__ok__) {
        throw new Error(`Evaluation error: ${parsed.__error__}\n${parsed.__stack__}`);
    }

    return parsed.__value__;
}

/**
 * Wrapper class providing background page functionality for Firefox via RDP.
 * Provides an API similar to Playwright's Page/Worker for evaluate() calls.
 */
class FirefoxBackgroundPage {
    constructor(rdpClient, consoleActor, evalResults) {
        this._client = rdpClient;
        this._consoleActor = consoleActor;
        this._evalResults = evalResults;
    }

    /**
     * Evaluate JavaScript code in the Firefox extension's background page context.
     * @param {Function|string} pageFunction - Function or string to evaluate
     * @param {...any} args - Arguments to pass to the function
     * @returns {Promise<any>} - Result of the evaluation
     */
    async evaluate(pageFunction, ...args) {
        if (!this._consoleActor) {
            throw new Error('Firefox background page not available - consoleActor is null');
        }

        // Convert function to string if needed
        let code;
        if (typeof pageFunction === 'function') {
            const fnStr = pageFunction.toString();
            if (args.length > 0) {
                // Serialize arguments and pass them to the function
                const serializedArgs = args.map((arg) => JSON.stringify(arg)).join(', ');
                code = `(${fnStr})(${serializedArgs})`;
            } else {
                code = `(${fnStr})()`;
            }
        } else {
            code = String(pageFunction);
        }

        return evaluateInFirefoxBackground(this._client, this._consoleActor, this._evalResults, code);
    }

    /**
     * Wait for a function to return a truthy value in the background page.
     * Similar to Playwright's page.waitForFunction().
     * @param {Function|string} pageFunction - Function to evaluate
     * @param {Object} options - Options (timeout, polling)
     * @param {...any} args - Arguments to pass to the function
     */
    async waitForFunction(pageFunction, options = {}, ...args) {
        const { timeout = 30000, polling = 100 } = options;
        const startTime = Date.now();

        while (true) {
            try {
                const result = await this.evaluate(pageFunction, ...args);
                if (result) {
                    return result;
                }
            } catch (e) {
                // Ignore errors during polling, just retry
            }

            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout waiting for function: ${pageFunction.toString().slice(0, 100)}`);
            }

            await new Promise((resolve) => setTimeout(resolve, polling));
        }
    }

    /**
     * Evaluate and return a handle to the result.
     * Note: This is a simplified implementation that doesn't return a true JSHandle,
     * but wraps the result in an object with similar methods for compatibility.
     * @param {Function|string} pageFunction - Function to evaluate
     * @param {...any} args - Arguments to pass to the function
     * @returns {Promise<Object>} - A handle-like object
     */
    async evaluateHandle(pageFunction, ...args) {
        const value = await this.evaluate(pageFunction, ...args);
        // Return a simple handle-like wrapper
        return {
            async evaluate(fn, ...evalArgs) {
                // For evaluateHandle results, we need to evaluate against the stored value
                // This is a simplified version - pass the value as the first argument
                if (typeof fn === 'function') {
                    return fn(value, ...evalArgs);
                }
                return value;
            },
            async jsonValue() {
                return value;
            },
            async dispose() {
                // No-op for our simple implementation
            },
        };
    }

    /**
     * Check if the background page is available for evaluation
     */
    isAvailable() {
        return this._consoleActor !== null;
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
            const addonId = 'jid1-ZAdIEUB7XOzOJw@jetpack'; // From manifest.json
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

            // Install the extension via RDP and get background page access
            try {
                const result = await installExtensionViaRDP(rdpPort, extensionPath, addonId);
                rdpClient = result.client;
                console.log(`Installed Firefox extension: ${result.addon.id}`);

                // Store Firefox-specific context for background evaluation
                context._firefoxBackgroundConsoleActor = result.backgroundConsoleActor;
                context._firefoxEvalResults = result.evalResults;
            } catch (err) {
                console.error('Failed to install Firefox extension:', err);
                await context.close();
                throw err;
            }

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
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker | FirefoxBackgroundPage | null}
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
            // Firefox: Set up context-level routing
            await context.route('**/*', routeHandler);

            // Create a Firefox background page wrapper with evaluate() support
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

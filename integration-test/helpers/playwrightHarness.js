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

// Debug logging helper
const DEBUG_FIREFOX = process.env.DEBUG_FIREFOX === '1' || process.env.CI === 'true';
function firefoxDebug(...args) {
    if (DEBUG_FIREFOX) {
        console.log('[Firefox Harness]', ...args);
    }
}

/**
 * Install a temporary extension in Firefox via RDP and get background page access
 */
async function installExtensionViaRDP(rdpPort, extensionPath, addonId) {
    firefoxDebug('installExtensionViaRDP: starting, port:', rdpPort);
    const client = new FirefoxRDPClient();

    // Set up event handlers for eval results
    const evalResults = new Map();
    client.onEvent((msg) => {
        if (msg.type === 'evaluationResult') {
            evalResults.set(msg.resultID, msg);
        }
    });

    firefoxDebug('installExtensionViaRDP: connecting to RDP...');
    await client.connect(rdpPort);
    firefoxDebug('installExtensionViaRDP: connected to RDP');

    try {
        // Get the addons actor
        firefoxDebug('installExtensionViaRDP: getting root info...');
        const rootInfo = await client.request('getRoot');
        const addonsActor = rootInfo.addonsActor;
        firefoxDebug('installExtensionViaRDP: got addonsActor:', addonsActor);

        if (!addonsActor) {
            throw new Error('Firefox does not provide an addons actor');
        }

        // Install the temporary addon
        firefoxDebug('installExtensionViaRDP: installing addon from:', extensionPath);
        const installResult = await client.request({
            to: addonsActor,
            type: 'installTemporaryAddon',
            addonPath: extensionPath,
        });
        firefoxDebug('installExtensionViaRDP: addon installed:', installResult.addon?.id);

        // Wait for extension to initialize
        firefoxDebug('installExtensionViaRDP: waiting 2s for extension init...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Get the addon's actor from listAddons
        firefoxDebug('installExtensionViaRDP: listing addons...');
        const addonsResponse = await client.request('listAddons');
        const ourAddon = addonsResponse.addons.find((a) => a.id === addonId);
        firefoxDebug('installExtensionViaRDP: found addon:', ourAddon?.id);

        if (!ourAddon) {
            throw new Error(`Could not find addon ${addonId} in listAddons`);
        }

        // Get watcher for the addon
        firefoxDebug('installExtensionViaRDP: getting watcher...');
        const watcherResult = await client.request({
            to: ourAddon.actor,
            type: 'getWatcher',
        });
        firefoxDebug('installExtensionViaRDP: got watcher:', watcherResult.actor);

        // Watch frame targets first (required before worker targets work)
        firefoxDebug('installExtensionViaRDP: watching frame targets...');
        await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'frame',
        });
        firefoxDebug('installExtensionViaRDP: frame targets watched');

        // Watch worker targets to get the background page
        firefoxDebug('installExtensionViaRDP: watching worker targets...');
        const workerResult = await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'worker',
        });
        firefoxDebug('installExtensionViaRDP: worker result:', workerResult.target?.url);

        let backgroundConsoleActor = null;
        if (workerResult.target && workerResult.target.url.includes('_generated_background_page')) {
            backgroundConsoleActor = workerResult.target.consoleActor;
            firefoxDebug('installExtensionViaRDP: got background consoleActor:', backgroundConsoleActor);

            // Start listening for evaluation results
            firefoxDebug('installExtensionViaRDP: starting listeners...');
            await client.request({
                to: backgroundConsoleActor,
                type: 'startListeners',
                listeners: ['evaluationResult'],
            });
            firefoxDebug('installExtensionViaRDP: listeners started');
        } else {
            firefoxDebug('installExtensionViaRDP: WARNING - no background page found!');
        }

        firefoxDebug('installExtensionViaRDP: complete');
        return {
            addon: installResult.addon,
            client,
            backgroundConsoleActor,
            evalResults,
        };
    } catch (err) {
        firefoxDebug('installExtensionViaRDP: ERROR:', err.message);
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
        firefoxDebug('evaluateInFirefoxBackground: ERROR - no consoleActor');
        throw new Error('No background console actor available - cannot evaluate in background');
    }

    firefoxDebug('evaluateInFirefoxBackground: evaluating code (length:', code.length, ')');

    // Wrap code in a function that handles async/Promise results
    // We use a global callback mechanism since RDP doesn't natively await async IIFEs
    const callbackId = `__evalCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wrappedCode = `
        (function() {
            try {
                let __result__ = (function() { return ${code}; })();
                // If result is a Promise, set up a callback
                if (__result__ && typeof __result__.then === 'function') {
                    globalThis.${callbackId} = { pending: true };
                    __result__.then(function(val) {
                        globalThis.${callbackId} = { pending: false, value: JSON.stringify({ __ok__: true, __value__: val }) };
                    }).catch(function(e) {
                        globalThis.${callbackId} = { pending: false, value: JSON.stringify({ __ok__: false, __error__: e.message, __stack__: e.stack }) };
                    });
                    return JSON.stringify({ __pending__: true, __callbackId__: ${JSON.stringify(callbackId)} });
                }
                return JSON.stringify({ __ok__: true, __value__: __result__ });
            } catch (e) {
                return JSON.stringify({ __ok__: false, __error__: e.message, __stack__: e.stack });
            }
        })()
    `;

    firefoxDebug('evaluateInFirefoxBackground: sending evaluateJSAsync request...');
    const evalRequest = await client.request({
        to: consoleActor,
        type: 'evaluateJSAsync',
        text: wrappedCode,
    });
    firefoxDebug('evaluateInFirefoxBackground: got resultID:', evalRequest.resultID);

    // Wait for result (with timeout)
    const timeout = 10000;
    const startTime = Date.now();
    while (!evalResults.has(evalRequest.resultID)) {
        if (Date.now() - startTime > timeout) {
            firefoxDebug('evaluateInFirefoxBackground: TIMEOUT waiting for result');
            throw new Error(`Timeout waiting for evaluation result`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    firefoxDebug('evaluateInFirefoxBackground: got result');

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

    // Handle pending async result
    if (parsed.__pending__) {
        const pendingCallbackId = parsed.__callbackId__;
        firefoxDebug('evaluateInFirefoxBackground: waiting for async result callback:', pendingCallbackId);

        // Poll for the callback result
        const asyncTimeout = 30000;
        const asyncStartTime = Date.now();
        while (Date.now() - asyncStartTime < asyncTimeout) {
            // Check if callback has completed
            const checkCode = `JSON.stringify(globalThis.${pendingCallbackId})`;
            const checkRequest = await client.request({
                to: consoleActor,
                type: 'evaluateJSAsync',
                text: checkCode,
            });

            // Wait for check result
            while (!evalResults.has(checkRequest.resultID)) {
                if (Date.now() - asyncStartTime > asyncTimeout) {
                    throw new Error('Timeout waiting for async evaluation result');
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            const checkResult = evalResults.get(checkRequest.resultID);
            evalResults.delete(checkRequest.resultID);

            if (checkResult.hasException) {
                throw new Error(`Async check error: ${checkResult.exceptionMessage}`);
            }

            const checkStr = checkResult.result;
            if (typeof checkStr === 'string') {
                const checkParsed = JSON.parse(checkStr);
                if (!checkParsed.pending) {
                    // Clean up callback
                    client.request({
                        to: consoleActor,
                        type: 'evaluateJSAsync',
                        text: `delete globalThis.${pendingCallbackId}`,
                    });

                    // Parse and return the actual result
                    const finalParsed = JSON.parse(checkParsed.value);
                    if (!finalParsed.__ok__) {
                        throw new Error(`Evaluation error: ${finalParsed.__error__}\n${finalParsed.__stack__}`);
                    }
                    return finalParsed.__value__;
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Timeout waiting for async evaluation result');
    }

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
     * This stores the object reference in the browser using a unique ID,
     * allowing subsequent evaluate() calls on the handle to access the actual object.
     * @param {Function|string} pageFunction - Function to evaluate
     * @param {...any} args - Arguments to pass to the function
     * @returns {Promise<Object>} - A handle-like object
     */
    async evaluateHandle(pageFunction, ...args) {
        // Generate a unique handle ID
        const handleId = `__pw_handle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Convert function to string if needed
        let code;
        if (typeof pageFunction === 'function') {
            const fnStr = pageFunction.toString();
            if (args.length > 0) {
                const serializedArgs = args.map((arg) => JSON.stringify(arg)).join(', ');
                code = `(${fnStr})(${serializedArgs})`;
            } else {
                code = `(${fnStr})()`;
            }
        } else {
            code = String(pageFunction);
        }

        // Store the result in a global map in the browser
        const storeCode = `
            (function() {
                globalThis.__playwrightHandles = globalThis.__playwrightHandles || new Map();
                globalThis.__playwrightHandles.set(${JSON.stringify(handleId)}, ${code});
                return true;
            })()
        `;

        await evaluateInFirefoxBackground(this._client, this._consoleActor, this._evalResults, storeCode);

        // Return a handle object that knows how to evaluate against the stored reference
        const client = this._client;
        const consoleActor = this._consoleActor;
        const evalResults = this._evalResults;

        return {
            _handleId: handleId,
            async evaluate(fn, ...evalArgs) {
                // Build code that retrieves the handle from the map and passes it to the function
                const fnStr = typeof fn === 'function' ? fn.toString() : String(fn);
                let evalCode;
                if (evalArgs.length > 0) {
                    const serializedArgs = evalArgs.map((arg) => JSON.stringify(arg)).join(', ');
                    evalCode = `
                        (function() {
                            const __h = globalThis.__playwrightHandles.get(${JSON.stringify(handleId)});
                            return (${fnStr})(__h, ${serializedArgs});
                        })()
                    `;
                } else {
                    evalCode = `
                        (function() {
                            const __h = globalThis.__playwrightHandles.get(${JSON.stringify(handleId)});
                            return (${fnStr})(__h);
                        })()
                    `;
                }
                return evaluateInFirefoxBackground(client, consoleActor, evalResults, evalCode);
            },
            async jsonValue() {
                const getCode = `globalThis.__playwrightHandles.get(${JSON.stringify(handleId)})`;
                return evaluateInFirefoxBackground(client, consoleActor, evalResults, getCode);
            },
            async dispose() {
                const deleteCode = `globalThis.__playwrightHandles.delete(${JSON.stringify(handleId)})`;
                await evaluateInFirefoxBackground(client, consoleActor, evalResults, deleteCode);
            },
        };
    }

    /**
     * Check if the background page is available for evaluation
     */
    isAvailable() {
        return this._consoleActor !== null;
    }

    /**
     * Stub for routeFromHAR - not supported for Firefox background page.
     * This exists to satisfy the check in backgroundWait.forFunction().
     */
    routeFromHAR() {
        throw new Error('routeFromHAR is not supported for Firefox background page');
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
            firefoxDebug('context fixture: starting Firefox test setup');
            firefoxDebug('context fixture: test name:', testInfo.title);
            // Firefox extension testing
            const extensionPath = path.join(projectRoot, 'build/firefox/dev');
            const addonId = 'jid1-ZAdIEUB7XOzOJw@jetpack'; // From manifest.json
            const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'firefox-test-'));
            firefoxDebug('context fixture: userDataDir:', userDataDir);
            firefoxDebug('context fixture: rdpPort:', rdpPort);

            firefoxDebug('context fixture: launching Firefox...');
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
            firefoxDebug('context fixture: Firefox launched');

            // Set up routes BEFORE installing the extension, so the extension
            // loads its TDS and config from our local test data.
            firefoxDebug('context fixture: setting up default routes...');
            await context.route('**/*', async (route) => {
                const url = route.request().url();
                if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                    firefoxDebug('context fixture: serving from local resources:', url.substring(0, 80));
                    return routeLocalResources(route);
                }
                if (url.startsWith('https://duckduckgo.com/atb.js')) {
                    firefoxDebug('context fixture: mocking ATB endpoint');
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
            });
            firefoxDebug('context fixture: default routes set up');

            // Wait for Firefox to be ready
            firefoxDebug('context fixture: waiting 1s for Firefox to be ready...');
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Install the extension via RDP and get background page access
            try {
                firefoxDebug('context fixture: installing extension via RDP...');
                const result = await installExtensionViaRDP(rdpPort, extensionPath, addonId);
                rdpClient = result.client;
                console.log(`Installed Firefox extension: ${result.addon.id}`);
                firefoxDebug('context fixture: extension installed successfully');

                // Store Firefox-specific context for background evaluation
                context._firefoxBackgroundConsoleActor = result.backgroundConsoleActor;
                context._firefoxEvalResults = result.evalResults;
            } catch (err) {
                console.error('Failed to install Firefox extension:', err);
                firefoxDebug('context fixture: ERROR installing extension:', err.message);
                await context.close();
                throw err;
            }

            // Store cleanup info
            context._firefoxUserDataDir = userDataDir;
            context._rdpClient = rdpClient;
            firefoxDebug('context fixture: setup complete, running test...');
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
        firefoxDebug('context fixture: test complete, cleaning up...');
        if (context._rdpClient) {
            firefoxDebug('context fixture: disconnecting RDP client');
            context._rdpClient.disconnect();
        }
        if (context._firefoxUserDataDir) {
            firefoxDebug('context fixture: removing user data dir');
            await fs.rm(context._firefoxUserDataDir, { recursive: true, force: true });
        }
        firefoxDebug('context fixture: cleanup complete');
    },
    /**
     * @type {import('@playwright/test').Page | import('@playwright/test').Worker | FirefoxBackgroundPage | null}
     */
    async backgroundPage({ context, manifestVersion }, use) {
        const routeHandler = (route) => {
            const url = route.request().url();
            if (DEBUG_FIREFOX) {
                firefoxDebug('routeHandler:', url.substring(0, 80));
            }
            if (url.startsWith('https://staticcdn.duckduckgo.com/')) {
                if (DEBUG_FIREFOX) firefoxDebug('routeHandler: serving from local resources');
                return routeLocalResources(route);
            }
            if (url.startsWith('https://duckduckgo.com/atb.js')) {
                if (DEBUG_FIREFOX) firefoxDebug('routeHandler: mocking ATB endpoint');
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
                if (DEBUG_FIREFOX) firefoxDebug('routeHandler: mocking pixel endpoint');
                return route.fulfill({
                    status: 200,
                    body: '',
                });
            }
            if (DEBUG_FIREFOX) firefoxDebug('routeHandler: continuing request');
            route.continue();
        };

        if (isFirefoxTest()) {
            // Firefox: Routes are already set up in the context fixture before extension install.
            // We don't need to set them up again here.

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

/**
 * Firefox-specific test harness for Playwright integration tests.
 *
 * This module provides Firefox extension testing support via the Remote Debugging Protocol (RDP).
 * It can be removed if Firefox testing is no longer needed.
 *
 * Known Limitations:
 * - Request interception: Extension background requests don't go through Playwright routes
 * - Content scripts: Some timing differs from Chrome
 * - Font blocking: Fonts loaded via inline @font-face may bypass webRequest
 */

/**
 * @typedef {import('@playwright/test').BrowserContext & {
 *   _firefoxUserDataDir?: string,
 *   _rdpClient?: FirefoxRDPClient,
 *   _firefoxBackgroundConsoleActor?: string,
 *   _firefoxEvalResults?: Map<string, any>
 * }} FirefoxBrowserContext
 */

/**
 * @typedef {'allowed' | 'blocked' | 'failed' | 'redirected'} RequestOutcomeStatus
 */

/**
 * @typedef {{
 *   url: string,
 *   status: RequestOutcomeStatus,
 *   resourceType: string,
 *   method?: string
 * }} RequestOutcome
 */

import net from 'net';
import { firefox } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';

/**
 * Find an available TCP port for Firefox RDP
 * @returns {Promise<number>}
 */
export async function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            const port = addr && typeof addr === 'object' ? addr.port : 0;
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
                const errorCode = /** @type {{ code?: string }} */ (err).code;
                if (errorCode === 'ECONNREFUSED' && i < maxRetries - 1) {
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
                return true;
            }
            try {
                const str = JSON.stringify(request);
                const msg = `${Buffer.from(str).length}:${str}`;
                if (this._conn) {
                    this._conn.write(msg);
                }
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
                this._eventHandlers.forEach((h) => h(msg));
            }
        }
    }
}

/**
 * Evaluate JavaScript code in the Firefox extension's background page via RDP.
 * Handles async/Promise results using a callback mechanism.
 */
async function evaluateInFirefoxBackground(client, consoleActor, evalResults, code) {
    if (!consoleActor) {
        throw new Error('No background console actor available');
    }

    // Check if the client is still connected
    if (!client._conn) {
        throw new Error('RDP client is not connected');
    }

    const callbackId = `__evalCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wrappedCode = `
        (function() {
            try {
                let __result__ = (function() { return ${code}; })();
                if (__result__ && typeof __result__.then === 'function') {
                    globalThis.${callbackId} = { pending: true };
                    __result__.then(function(val) {
                        globalThis.${callbackId} = { pending: false, value: JSON.stringify({ __ok__: true, __value__: val }) };
                    }).catch(function(e) {
                        globalThis.${callbackId} = { pending: false, value: JSON.stringify({ __ok__: false, __error__: e.message }) };
                    });
                    return JSON.stringify({ __pending__: true, __callbackId__: ${JSON.stringify(callbackId)} });
                }
                return JSON.stringify({ __ok__: true, __value__: __result__ });
            } catch (e) {
                return JSON.stringify({ __ok__: false, __error__: e.message });
            }
        })()
    `;

    let evalRequest;
    try {
        evalRequest = await client.request({
            to: consoleActor,
            type: 'evaluateJSAsync',
            text: wrappedCode,
        });
    } catch (e) {
        throw new Error(`RDP evaluateJSAsync request failed: ${/** @type {Error} */ (e).message}`);
    }

    if (!evalRequest.resultID) {
        throw new Error(`RDP evaluateJSAsync did not return a resultID: ${JSON.stringify(evalRequest)}`);
    }

    const timeout = 30000;
    const startTime = Date.now();
    while (!evalResults.has(evalRequest.resultID)) {
        if (Date.now() - startTime > timeout) {
            // Check if connection is still active
            const connState = client._conn ? 'connected' : 'disconnected';
            const pendingCount = evalResults.size;
            const existingResultIds = Array.from(evalResults.keys()).join(', ');
            throw new Error(
                `Timeout waiting for evaluation result (resultID: ${evalRequest.resultID}, conn: ${connState}, pendingResults: ${pendingCount}, existingIds: [${existingResultIds}])`,
            );
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const result = evalResults.get(evalRequest.resultID);
    evalResults.delete(evalRequest.resultID);

    if (result.hasException) {
        throw new Error(`Evaluation error: ${result.exceptionMessage}`);
    }

    const resultValue = result.result;
    let resultString;

    if (typeof resultValue === 'object' && resultValue !== null) {
        if (resultValue.type === 'undefined') return undefined;

        // Handle longString type - RDP returns this for large strings
        if (resultValue.type === 'longString' && resultValue.actor) {
            const substringResult = await client.request({
                to: resultValue.actor,
                type: 'substring',
                start: 0,
                end: resultValue.length,
            });
            resultString = substringResult.substring;
        } else if (typeof resultValue.value !== 'undefined') {
            resultString = typeof resultValue.value === 'string' ? resultValue.value : JSON.stringify(resultValue.value);
        } else {
            throw new Error(`Unexpected result object structure: ${JSON.stringify(resultValue).slice(0, 200)}`);
        }
    } else if (typeof resultValue === 'string') {
        resultString = resultValue;
    } else {
        throw new Error(`Unexpected result type: ${typeof resultValue}`);
    }

    const parsed = JSON.parse(resultString);

    // Handle pending async result
    if (parsed.__pending__) {
        const pendingCallbackId = parsed.__callbackId__;
        const asyncTimeout = 30000;
        const asyncStartTime = Date.now();
        while (Date.now() - asyncStartTime < asyncTimeout) {
            const checkCode = `JSON.stringify(globalThis.${pendingCallbackId})`;
            const checkRequest = await client.request({
                to: consoleActor,
                type: 'evaluateJSAsync',
                text: checkCode,
            });
            while (!evalResults.has(checkRequest.resultID)) {
                if (Date.now() - asyncStartTime > asyncTimeout) {
                    throw new Error('Timeout waiting for async result');
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
                    // Clean up - must await and consume the evaluationResult to avoid leftover results
                    const cleanupRequest = await client.request({
                        to: consoleActor,
                        type: 'evaluateJSAsync',
                        text: `delete globalThis.${pendingCallbackId}`,
                    });
                    // Wait for and consume the cleanup's evaluationResult
                    const cleanupTimeout = Date.now() + 5000;
                    while (!evalResults.has(cleanupRequest.resultID)) {
                        if (Date.now() > cleanupTimeout) break; // Don't block forever on cleanup
                        await new Promise((resolve) => setTimeout(resolve, 50));
                    }
                    evalResults.delete(cleanupRequest.resultID);

                    const finalParsed = JSON.parse(checkParsed.value);
                    if (!finalParsed.__ok__) {
                        throw new Error(`Evaluation error: ${finalParsed.__error__}`);
                    }
                    return finalParsed.__value__;
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Timeout waiting for async evaluation result');
    }

    if (!parsed.__ok__) {
        throw new Error(`Evaluation error: ${parsed.__error__}`);
    }
    return parsed.__value__;
}

/**
 * Wrapper class providing background page functionality for Firefox via RDP.
 * Provides an API similar to Playwright's Page/Worker for evaluate() calls.
 */
export class FirefoxBackgroundPage {
    constructor(rdpClient, consoleActor, evalResults) {
        this._client = rdpClient;
        this._consoleActor = consoleActor;
        this._evalResults = evalResults;
    }

    async evaluate(pageFunction, ...args) {
        if (!this._consoleActor) {
            throw new Error('Firefox background page not available');
        }
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
        return evaluateInFirefoxBackground(this._client, this._consoleActor, this._evalResults, code);
    }

    async waitForFunction(pageFunction, options = {}, ...args) {
        const { timeout = 30000, polling = 100 } = options;
        const startTime = Date.now();
        while (true) {
            try {
                const result = await this.evaluate(pageFunction, ...args);
                if (result) return result;
            } catch (e) {
                // Ignore errors during polling
            }
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout waiting for function`);
            }
            await new Promise((resolve) => setTimeout(resolve, polling));
        }
    }

    async evaluateHandle(pageFunction, ...args) {
        const handleId = `__pw_handle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        const storeCode = `
            (function() {
                globalThis.__playwrightHandles = globalThis.__playwrightHandles || new Map();
                globalThis.__playwrightHandles.set(${JSON.stringify(handleId)}, ${code});
                return true;
            })()
        `;
        await evaluateInFirefoxBackground(this._client, this._consoleActor, this._evalResults, storeCode);

        const client = this._client;
        const consoleActor = this._consoleActor;
        const evalResults = this._evalResults;

        return {
            _handleId: handleId,
            async evaluate(fn, ...evalArgs) {
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

    isAvailable() {
        return this._consoleActor !== null;
    }

    routeFromHAR() {
        throw new Error('routeFromHAR is not supported for Firefox background page');
    }
}

/**
 * Install a temporary extension in Firefox via RDP and get background page access
 */
export async function installExtensionViaRDP(rdpPort, extensionPath, addonId) {
    const client = new FirefoxRDPClient();
    const evalResults = new Map();

    client.onEvent((msg) => {
        if (msg.type === 'evaluationResult') {
            evalResults.set(msg.resultID, msg);
        }
    });

    await client.connect(rdpPort);

    try {
        const rootInfo = await client.request('getRoot');
        const addonsActor = rootInfo.addonsActor;
        if (!addonsActor) {
            throw new Error('Firefox does not provide an addons actor');
        }

        const installResult = await client.request({
            to: addonsActor,
            type: 'installTemporaryAddon',
            addonPath: extensionPath,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const addonsResponse = await client.request('listAddons');
        const ourAddon = addonsResponse.addons.find((a) => a.id === addonId);
        if (!ourAddon) {
            throw new Error(`Could not find addon ${addonId}`);
        }

        const watcherResult = await client.request({
            to: ourAddon.actor,
            type: 'getWatcher',
        });

        await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'frame',
        });

        const workerResult = await client.request({
            to: watcherResult.actor,
            type: 'watchTargets',
            targetType: 'worker',
        });

        let backgroundConsoleActor = null;
        if (workerResult.target && workerResult.target.url.includes('_generated_background_page')) {
            backgroundConsoleActor = workerResult.target.consoleActor;
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
 * Create a Firefox browser context with extension support
 * @param {number} rdpPort
 * @param {string} extensionPath
 * @param {string} addonId
 * @returns {Promise<{context: FirefoxBrowserContext, rdpResult: any}>}
 */
export async function createFirefoxContext(rdpPort, extensionPath, addonId) {
    const userDataDir = await fs.mkdtemp(`${os.tmpdir()}/firefox-test-`);

    const context = await firefox.launchPersistentContext(userDataDir, {
        headless: false,
        firefoxUserPrefs: {
            'xpinstall.signatures.required': false,
            'extensions.autoDisableScopes': 0,
            'extensions.enabledScopes': 15,
            'devtools.debugger.remote-enabled': true,
            'devtools.debugger.prompt-connection': false,
        },
        args: [`-start-debugger-server=${rdpPort}`],
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const rdpResult = await installExtensionViaRDP(rdpPort, extensionPath, addonId);

    // Store for cleanup - cast to our extended type
    const ffContext = /** @type {FirefoxBrowserContext} */ (context);
    ffContext._firefoxUserDataDir = userDataDir;
    ffContext._rdpClient = rdpResult.client;
    ffContext._firefoxBackgroundConsoleActor = rdpResult.backgroundConsoleActor;
    ffContext._firefoxEvalResults = rdpResult.evalResults;

    return { context: ffContext, rdpResult };
}

/**
 * Clean up Firefox context resources
 * @param {FirefoxBrowserContext} context
 */
export async function cleanupFirefoxContext(context) {
    // Disconnect RDP first
    if (context._rdpClient) {
        context._rdpClient.disconnect();
    }

    // Clear the evalResults map to prevent any stale state
    if (context._firefoxEvalResults) {
        context._firefoxEvalResults.clear();
    }

    // Close the browser context
    try {
        await context.close();
    } catch (e) {
        // Context might already be closed
    }

    // Wait for browser to fully shut down
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clean up temp directory
    if (context._firefoxUserDataDir) {
        try {
            await fs.rm(context._firefoxUserDataDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Set up webRequest listeners in the Firefox extension background to track request outcomes.
 * This is used as a workaround for Playwright's requestfinished/requestfailed events not firing
 * reliably on Firefox.
 *
 * The tracking stores pending requests and completed outcomes separately, matching them up
 * when outcomes arrive. Outcomes are stored in a queue that can be polled one at a time.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @param {boolean} [enableDebugLogging=false] - Whether to enable console logging for debugging
 * @returns {Promise<void>}
 */
export async function setupFirefoxRequestTracking(backgroundPage, enableDebugLogging = false) {
    await backgroundPage.evaluate((debugLogging) => {
        // Initialize the request tracking storage if not already present
        if (globalThis.__playwright_request_tracking) {
            // Already set up, just clear any existing data
            globalThis.__playwright_request_tracking.pendingRequests = new Map();
            globalThis.__playwright_request_tracking.completedOutcomes = [];
            globalThis.__playwright_request_tracking.debugLogging = debugLogging;
            if (debugLogging) {
                console.log('[Playwright Request Tracking] Cleared existing data, listeners already active');
            }
            return;
        }

        globalThis.__playwright_request_tracking = {
            // Map of requestId -> { url, method, resourceType }
            pendingRequests: new Map(),
            // Array of completed outcomes: { url, status, resourceType, method }
            completedOutcomes: [],
            listenersActive: true,
            debugLogging,
        };

        const tracking = globalThis.__playwright_request_tracking;

        const determineStatus = (outcomeType, statusCode, error) => {
            if (outcomeType === 'completed') {
                if (statusCode >= 300 && statusCode < 400) {
                    return 'redirected';
                }
                return 'allowed';
            } else {
                // Error occurred
                const errorStr = error || '';
                if (errorStr.includes('NS_ERROR_ABORT') || errorStr.includes('ERR_BLOCKED') || errorStr === 'net::ERR_BLOCKED_BY_CLIENT') {
                    return 'blocked';
                }
                return 'failed';
            }
        };

        const recordOutcome = (details, outcomeType) => {
            const requestId = details.requestId;
            const pendingRequest = tracking.pendingRequests.get(requestId);

            if (pendingRequest) {
                tracking.pendingRequests.delete(requestId);
                const status = determineStatus(outcomeType, details.statusCode, details.error);
                const outcome = {
                    url: pendingRequest.url,
                    status,
                    resourceType: pendingRequest.resourceType,
                    method: pendingRequest.method,
                };
                tracking.completedOutcomes.push(outcome);
                if (tracking.debugLogging) {
                    console.log('[Playwright Request Tracking] Outcome:', outcome.url, '->', status);
                }
            }
        };

        if (debugLogging) {
            console.log('[Playwright Request Tracking] Setting up webRequest listeners');
        }

        // Track requests as they start
        chrome.webRequest.onBeforeRequest.addListener(
            (details) => {
                tracking.pendingRequests.set(details.requestId, {
                    url: details.url,
                    method: details.method,
                    resourceType: details.type,
                });
                if (tracking.debugLogging) {
                    console.log('[Playwright Request Tracking] Started:', details.url);
                }
            },
            { urls: ['<all_urls>'] },
        );

        // Listen for completed requests (successful requests)
        chrome.webRequest.onCompleted.addListener(
            (details) => {
                recordOutcome(details, 'completed');
            },
            { urls: ['<all_urls>'] },
        );

        // Listen for error/blocked requests
        chrome.webRequest.onErrorOccurred.addListener(
            (details) => {
                recordOutcome(details, 'error');
            },
            { urls: ['<all_urls>'] },
        );

        if (debugLogging) {
            console.log('[Playwright Request Tracking] Listeners set up successfully');
        }
    }, enableDebugLogging);
}

/**
 * Get and remove the first completed request outcome from the Firefox extension background.
 * Returns null if no outcomes are available.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @param {string} [urlPrefix] - Optional URL prefix filter
 * @returns {Promise<RequestOutcome | null>}
 */
export async function popFirefoxRequestOutcome(backgroundPage, urlPrefix) {
    return await backgroundPage.evaluate((prefix) => {
        const tracking = globalThis.__playwright_request_tracking;
        if (!tracking || tracking.completedOutcomes.length === 0) {
            return null;
        }

        if (prefix) {
            // Find and remove the first matching outcome
            const index = tracking.completedOutcomes.findIndex((o) => o.url.startsWith(prefix));
            if (index === -1) {
                return null;
            }
            return tracking.completedOutcomes.splice(index, 1)[0];
        } else {
            // Return and remove the first outcome
            return tracking.completedOutcomes.shift();
        }
    }, urlPrefix || null);
}

/**
 * Get the count of pending and completed request outcomes.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @returns {Promise<{pending: number, completed: number}>}
 */
export async function getFirefoxRequestTrackingStats(backgroundPage) {
    return await backgroundPage.evaluate(() => {
        const tracking = globalThis.__playwright_request_tracking;
        if (!tracking) {
            return { pending: 0, completed: 0 };
        }
        return {
            pending: tracking.pendingRequests.size,
            completed: tracking.completedOutcomes.length,
        };
    });
}

/**
 * Clear all tracked request data from the Firefox extension background.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @returns {Promise<void>}
 */
export async function clearFirefoxTrackedRequests(backgroundPage) {
    await backgroundPage.evaluate(() => {
        if (globalThis.__playwright_request_tracking) {
            globalThis.__playwright_request_tracking.pendingRequests = new Map();
            globalThis.__playwright_request_tracking.completedOutcomes = [];
        }
    });
}

/**
 * Get all tracked request events from the Firefox extension background.
 * Note: This returns outcomes that have not been popped yet.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @returns {Promise<RequestOutcome[]>}
 */
export async function getFirefoxTrackedRequests(backgroundPage) {
    return await backgroundPage.evaluate(() => {
        const tracking = globalThis.__playwright_request_tracking;
        if (!tracking) {
            return [];
        }
        return tracking.completedOutcomes.slice();
    });
}

/**
 * Wait for request outcomes by polling and collecting them one at a time.
 * This avoids the RDP "longString" issue by keeping responses small.
 *
 * @param {FirefoxBackgroundPage} backgroundPage - The Firefox background page wrapper
 * @param {object} options
 * @param {string} [options.urlPrefix] - URL prefix filter for requests to collect
 * @param {number} [options.expectedCount] - Number of request outcomes to wait for
 * @param {number} [options.timeout=30000] - Timeout in milliseconds
 * @param {number} [options.pollInterval=100] - Polling interval in milliseconds
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {Promise<RequestOutcome[]>}
 */
export async function waitForFirefoxRequestOutcomes(backgroundPage, options = {}) {
    const { urlPrefix, expectedCount = 1, timeout = 30000, pollInterval = 100, debug = false } = options;

    const startTime = Date.now();
    /** @type {RequestOutcome[]} */
    const results = [];

    while (Date.now() - startTime < timeout) {
        // Try to pop an outcome
        const outcome = await popFirefoxRequestOutcome(backgroundPage, urlPrefix);

        if (outcome) {
            results.push(outcome);
            if (debug) {
                console.log(
                    `[waitForFirefoxRequestOutcomes] Got outcome ${results.length}/${expectedCount}:`,
                    outcome.url,
                    '->',
                    outcome.status,
                );
            }

            if (results.length >= expectedCount) {
                return results;
            }
            // Continue immediately to check for more
            continue;
        }

        // No outcome available, wait before polling again
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout reached - if we're here, we didn't get enough results
    if (debug) {
        const stats = await getFirefoxRequestTrackingStats(backgroundPage);
        console.log(`[waitForFirefoxRequestOutcomes] Timeout. Got ${results.length}/${expectedCount}. Stats:`, stats);
    }

    throw new Error(`Timeout waiting for ${expectedCount} request outcomes. Only found ${results.length}.`);
}

/* global DEBUG */

/**
 * Messaging over `chrome.ddg`, the custom extension API that DuckDuckGo-branded
 * Chromium exposes to component extensions. Messages use the same
 * `{ context, featureName, method, params }` envelope as the macOS embedded
 * build's native messaging.
 */

const CONTEXT = 'ddgInternalExtension';

export const DDG_MESSAGE_TIMEOUT_MS = 20 * 1000;

/**
 * True when running as a component extension inside DDG-branded Chromium, and
 * false everywhere else — plain Chromium, an unpacked dev build, the
 * integration tests.
 *
 * @returns {boolean}
 */
export function hasDdgApi() {
    return typeof chrome !== 'undefined' && typeof chrome.ddg?.send === 'function';
}

/**
 * Send one message to the browser and wait for its reply.
 *
 * Never throws. Returns null if the API is absent, the call fails, or the
 * browser does not answer within `timeout`. A browser that answers but does not
 * implement the method returns `{ error: { code, message } }`, which is a reply,
 * not a failure — callers check the reply's shape before using it.
 *
 * @param {string} featureName
 * @param {string} method
 * @param {Record<string, any>} [params]
 * @param {number} [timeout] - milliseconds before the call is abandoned
 * @returns {Promise<any>} the browser's reply, or null
 */
export async function sendToBrowser(featureName, method, params = {}, timeout = DDG_MESSAGE_TIMEOUT_MS) {
    const ddg = typeof chrome !== 'undefined' ? chrome.ddg : undefined;
    if (!ddg) {
        DEBUG && console.log('[ddg] no chrome.ddg, skipping', `${featureName}.${method}`);
        return null;
    }
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeoutId;
    try {
        DEBUG && console.log('[ddg] SEND', `${featureName}.${method}`, params);
        const reply = await Promise.race([
            ddg.send({ context: CONTEXT, featureName, method, params }),
            new Promise((_resolve, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`chrome.ddg.send timed out after ${timeout}ms`)), timeout);
            }),
        ]);
        DEBUG && console.log('[ddg] REPLY', `${featureName}.${method}`, reply);
        return reply ?? null;
    } catch (e) {
        console.error(`[ddg] ${featureName}.${method} failed`, e);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

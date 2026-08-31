/* global DEBUG */

/**
 * Messaging over `chrome.ddg`, the custom extension API that DuckDuckGo-branded
 * Chromium exposes to component extensions.
 *
 * This is the chromium-embedded build's counterpart to `native-messaging.js`,
 * which the macOS embedded build uses. The envelope is deliberately the same
 * `{ context, featureName, method, params }` shape, so a method means the same
 * thing on both sides of the port and only the transport call differs.
 *
 * See `ddg_privacy_tooling_messaging.md` in the chromium repo for the API
 * itself, and `ddg_cpm_messaging.md` for the methods CPM sends over it.
 */

/** Context shared with the macOS embedded build's native messages. */
const CONTEXT = 'ddgInternalExtension';

/**
 * Matches the 20s the macOS embedded build allows a native message. A browser
 * that never answers must not leave a promise pending for the life of the
 * service worker.
 */
export const DDG_MESSAGE_TIMEOUT_MS = 20 * 1000;

/**
 * True when running as a component extension inside DDG-branded Chromium, and
 * false everywhere else — plain Chromium, an unpacked dev build, the
 * integration tests. Callers fall back to extension-side behaviour when false.
 *
 * @returns {boolean}
 */
export function hasDdgApi() {
    return typeof chrome !== 'undefined' && typeof chrome.ddg?.send === 'function';
}

/**
 * Send one message to the browser and wait for its reply.
 *
 * Never throws. Returns null if the API is absent, the browser reports an
 * error, or it does not answer within `timeout` — deciding what an unanswered
 * call means is the caller's job, not the transport's.
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

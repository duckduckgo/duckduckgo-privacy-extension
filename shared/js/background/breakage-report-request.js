import { sendTabMessage } from './utils';

/** @type {Map<number, {resolve: Function, timeout: ReturnType<typeof setTimeout>}>} */
const pendingRequests = new Map();

const REQUEST_TIMEOUT_MS = 500;

/**
 * Request breakage report data from content-scope-scripts for a tab.
 * Returns a promise that resolves when breakageReportResult is received or times out.
 *
 * @param {number} tabId
 * @returns {Promise<object|null>}
 */
export function requestBreakageReportData(tabId) {
    // Cancel any existing pending request for this tab
    const existing = pendingRequests.get(tabId);
    if (existing) {
        clearTimeout(existing.timeout);
        existing.resolve(null);
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            pendingRequests.delete(tabId);
            resolve(null);
        }, REQUEST_TIMEOUT_MS);

        pendingRequests.set(tabId, { resolve, timeout });

        sendTabMessage(tabId, { messageType: 'getBreakageReportValues' }, { frameId: 0 });
    });
}

/**
 * Resolve a pending breakage report request with data.
 * Called from breakageReportResult message handler.
 *
 * @param {number} tabId
 * @param {object} data
 * @returns {boolean} true if there was a pending request
 */
export function resolveBreakageReportRequest(tabId, data) {
    const pending = pendingRequests.get(tabId);
    if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(tabId);
        pending.resolve(data);
        return true;
    }
    return false;
}

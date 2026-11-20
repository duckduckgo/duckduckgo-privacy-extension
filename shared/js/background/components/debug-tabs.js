import browser from 'webextension-polyfill';
import { registerMessageHandler } from '../message-registry';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';
import { isActive } from '../devtools';

const STORAGE_KEY = 'debugTabs';
const ACTIONS = new Set(['get', 'enable', 'disable']);

/**
 * @typedef {{ available: false } | { available: true, enabled: boolean, devtools: boolean }} TabDebugState
 */

/**
 * The most recently constructed instance, read by `isDebugTab` and `debugTabsReady` (as
 * `registerDevtools` does for `isActive` in devtools.js).
 * @type {DebugTabs | null}
 */
let registered = null;

/**
 * @param {number} tabId
 * @returns {boolean}
 */
export function isDebugTab(tabId) {
    return registered?.has(tabId) ?? false;
}

/**
 * Resolves once the tabs saved before a background restart are loaded.
 * @returns {Promise<void>}
 */
export async function debugTabsReady() {
    await registered?.ready;
}

/**
 * Tabs that load content-scope-scripts with `debug: true` because a page in the tab asked for it,
 * through the `tabDebug` message (see content-scope-messaging.js). Test pages use it to turn on the
 * debug events they display.
 *
 * Only developer builds act on the message: a page that turns its own debug flag on can read which
 * detections fired. Release builds answer `{ available: false }`. A connected devtools panel keeps
 * a tab's debug flag on whatever the page asks.
 *
 * The tabs are kept in session storage, so they survive a background restart, and a tab is
 * forgotten when it closes.
 */
export default class DebugTabs {
    /**
     * @param {{
     *   debugBuild: boolean
     * }} args
     */
    constructor({ debugBuild }) {
        this.debugBuild = debugBuild;
        /** @type {Set<number>} */
        this.tabs = new Set();
        this.ready = this.load();
        registered = this;

        registerMessageHandler('tabDebug', (options, sender) => this.onMessage(options?.action, sender?.tab?.id));
        browser.tabs.onRemoved.addListener((tabId) => {
            if (this.tabs.delete(tabId)) this.save();
        });
    }

    async load() {
        const saved = await getFromSessionStorage(STORAGE_KEY);
        if (Array.isArray(saved)) {
            for (const tabId of saved) this.tabs.add(tabId);
        }
    }

    save() {
        return setToSessionStorage(STORAGE_KEY, [...this.tabs]);
    }

    /**
     * @param {number} tabId
     * @returns {boolean}
     */
    has(tabId) {
        return this.tabs.has(tabId);
    }

    /**
     * @param {unknown} action
     * @param {number | undefined} tabId
     * @returns {Promise<TabDebugState>}
     */
    async onMessage(action, tabId) {
        if (!this.debugBuild || typeof tabId !== 'number' || typeof action !== 'string' || !ACTIONS.has(action)) {
            return { available: false };
        }
        await this.ready;
        if (action !== 'get' && this.tabs.has(tabId) !== (action === 'enable')) {
            if (action === 'enable') this.tabs.add(tabId);
            else this.tabs.delete(tabId);
            await this.save();
            // The new flag reaches content-scope-scripts on the tab's next load
            await browser.tabs.reload(tabId);
        }
        return { available: true, enabled: this.tabs.has(tabId), devtools: isActive(tabId) };
    }
}

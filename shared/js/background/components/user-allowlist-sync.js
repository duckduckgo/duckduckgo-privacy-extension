import browser from 'webextension-polyfill';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/**
 * Manifest command the native app performs (via `WKWebExtensionContext.performCommand`) when the user's
 * allowlist changes. WebKit wakes a sleeping background to deliver it, so one signal covers both the asleep
 * and the awake case. It has no shortcut, and carries no payload: it only tells the extension to pull.
 */
export const ALLOWLIST_CHANGED_COMMAND = 'ddg-allowlist-changed';
export const ALLOWLIST_STORAGE_KEY = 'userAllowlist';

/**
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {{ version: string | null, domains: string[] }} AllowlistState
 * @typedef {(state: AllowlistState) => void} AllowlistListener
 * @typedef {{ onCommand: { addListener: (listener: (command: string) => void) => void } }} CommandsApi
 */

/**
 * Keeps a copy of the native app's user allowlist (sites where the user disabled protections).
 *
 * Sync is pull-based and versioned: the extension sends the version it holds, and native answers with the
 * list only when it differs. A sync runs on every background start (covering wakes from sleep) and whenever
 * native performs `ALLOWLIST_CHANGED_COMMAND`. Because the state is reconciled by version, a lost or
 * duplicated signal costs at most one redundant request.
 */
export class UserAllowlistSync {
    /**
     * @param {NativeMessagingInterface} nativeMessaging - messaging for the native `userAllowlist` feature
     * @param {object} [options]
     * @param {CommandsApi | undefined} [options.commands] - defaults to `browser.commands`
     */
    constructor(nativeMessaging, { commands = browser.commands } = {}) {
        this.nativeMessaging = nativeMessaging;
        /** @type {AllowlistState} */
        this._state = { version: null, domains: [] };
        /** @type {Set<string>} */
        this._domainSet = new Set();
        /** @type {Set<AllowlistListener>} */
        this._listeners = new Set();
        /** @type {Promise<AllowlistState> | null} */
        this._inFlight = null;
        /** @type {boolean} */
        this._resyncRequested = false;

        // WebKit only wakes a non-persistent background for events it saw a listener for, so this must be
        // registered synchronously during the background's first turn.
        commands?.onCommand.addListener((command) => {
            if (command === ALLOWLIST_CHANGED_COMMAND) {
                this.sync();
            }
        });

        this.ready = this._restore().then(() => this.sync());
    }

    async _restore() {
        const stored = await getFromSessionStorage(ALLOWLIST_STORAGE_KEY);
        if (stored && Array.isArray(stored.domains)) {
            this._apply(stored, false);
        }
    }

    /**
     * Pulls the allowlist from native if it changed. Concurrent calls share one request; a call made while a
     * request is in flight schedules one more, so a change signalled mid-request is not missed.
     * @returns {Promise<AllowlistState>}
     */
    sync() {
        if (this._inFlight) {
            this._resyncRequested = true;
            return this._inFlight;
        }
        this._inFlight = (async () => {
            try {
                do {
                    this._resyncRequested = false;
                    await this._syncOnce();
                } while (this._resyncRequested);
            } finally {
                this._inFlight = null;
            }
            return this._state;
        })();
        return this._inFlight;
    }

    async _syncOnce() {
        let result;
        try {
            result = await this.nativeMessaging.request('getAllowlistIfNew', { version: this._state.version });
        } catch (e) {
            console.error('UserAllowlistSync: failed to fetch allowlist', e);
            return;
        }
        if (!result?.updated || !Array.isArray(result.domains) || typeof result.version !== 'string') {
            return;
        }
        const state = { version: result.version, domains: result.domains };
        await setToSessionStorage(ALLOWLIST_STORAGE_KEY, state);
        this._apply(state, true);
    }

    /**
     * @param {AllowlistState} state
     * @param {boolean} notify
     */
    _apply(state, notify) {
        this._state = state;
        this._domainSet = new Set(state.domains);
        if (notify) {
            for (const listener of this._listeners) {
                try {
                    listener(state);
                } catch (e) {
                    console.error('UserAllowlistSync: listener failed', e);
                }
            }
        }
    }

    /**
     * Matches native `isUserUnprotected(domain:)`, which compares hostnames exactly.
     * @param {string} hostname
     */
    isAllowlisted(hostname) {
        return this._domainSet.has(hostname.toLowerCase());
    }

    /** @returns {string[]} */
    get domains() {
        return this._state.domains;
    }

    /** @returns {string | null} */
    get version() {
        return this._state.version;
    }

    /**
     * @param {AllowlistListener} listener - called after the allowlist changes
     * @returns {() => void} removes the listener
     */
    onChange(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }
}

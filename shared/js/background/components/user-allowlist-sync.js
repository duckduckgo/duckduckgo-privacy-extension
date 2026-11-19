import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/**
 * Subscription event native sends, with `{ version, domains }`, when the user's allowlist changes.
 */
export const ALLOWLIST_CHANGED_SUBSCRIPTION = 'onAllowlistChanged';
export const ALLOWLIST_STORAGE_KEY = 'userAllowlist';

/**
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {{ version: string | null, domains: string[] }} AllowlistState
 * @typedef {(state: AllowlistState) => void} AllowlistListener
 */

/**
 * Keeps a copy of the native app's user allowlist (sites where the user disabled protections).
 *
 * Changes arrive as `ALLOWLIST_CHANGED_SUBSCRIPTION` events, which carry the whole list. On every background start
 * the extension also pulls the list, sending the version it holds so native answers with the list only when it
 * differs. That covers changes made while the extension was not loaded, or before an app restart.
 */
export class UserAllowlistSync {
    /**
     * @param {NativeMessagingInterface} nativeMessaging - messaging for the native `userAllowlist` feature
     */
    constructor(nativeMessaging) {
        this.nativeMessaging = nativeMessaging;
        /** @type {AllowlistState} */
        this._state = { version: null, domains: [] };
        /** @type {Set<string>} */
        this._domainSet = new Set();
        /** @type {Set<AllowlistListener>} */
        this._listeners = new Set();
        /** Counts applied change events, so a pull that started before one can't overwrite it. */
        this._eventCount = 0;
        /** @type {Promise<void>} */
        this._persisting = Promise.resolve();

        // Subscribed synchronously, so native can wake the background to deliver changes.
        nativeMessaging.subscribe(ALLOWLIST_CHANGED_SUBSCRIPTION, (params) => this._onChanged(params));

        this.ready = this._restore().then(() => this._pull());
    }

    async _restore() {
        const stored = await getFromSessionStorage(ALLOWLIST_STORAGE_KEY);
        // A change event may have arrived while storage was being read; it is newer than the stored copy.
        if (stored && Array.isArray(stored.domains) && this._eventCount === 0) {
            this._state = stored;
            this._domainSet = new Set(stored.domains);
        }
    }

    /**
     * Pulls the allowlist from native if it changed since the version held.
     */
    async _pull() {
        const eventCount = this._eventCount;
        let result;
        try {
            result = await this.nativeMessaging.request('getAllowlistIfNew', { version: this._state.version });
        } catch (e) {
            console.error('UserAllowlistSync: failed to fetch allowlist', e);
            return;
        }
        // A change event that arrived during the request may be newer than this response.
        if (eventCount === this._eventCount) {
            this._update(result);
        }
    }

    /**
     * @param {Record<string, any>} params
     */
    _onChanged(params) {
        this._eventCount++;
        this._update({ ...params, updated: true });
    }

    /**
     * Applies, stores and announces a list from native if it is well formed and new.
     * @param {any} result
     */
    _update(result) {
        if (!result?.updated || !Array.isArray(result.domains) || typeof result.version !== 'string') {
            return;
        }
        if (result.version === this._state.version) {
            return;
        }
        const state = { version: result.version, domains: result.domains };
        this._state = state;
        this._domainSet = new Set(state.domains);
        // Writes run in order and store the state current when they run, so the last write is the newest state.
        this._persisting = this._persisting
            .then(() => setToSessionStorage(ALLOWLIST_STORAGE_KEY, this._state))
            .catch((e) => console.error('UserAllowlistSync: failed to store allowlist', e));
        for (const listener of this._listeners) {
            try {
                listener(state);
            } catch (e) {
                console.error('UserAllowlistSync: listener failed', e);
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

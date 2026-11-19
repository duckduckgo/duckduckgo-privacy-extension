import settings from '../settings';

/**
 * Subscription event native sends, with `{ version, domains }`, when the user's allowlist changes.
 */
export const ALLOWLIST_CHANGED_SUBSCRIPTION = 'onAllowlistChanged';
/** The setting `utils.isSafeListed` reads: an object whose keys are the allowlisted domains. */
export const ALLOWLIST_SETTING = 'allowlisted';
/** The setting holding the native version of the list in `ALLOWLIST_SETTING`. */
export const ALLOWLIST_VERSION_SETTING = 'userAllowlistVersion';

/**
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {Pick<typeof settings, 'ready' | 'getSetting' | 'updateSetting'>} SettingsApi
 */

/**
 * Keeps the extension's `allowlisted` setting in step with the native app's user allowlist (sites where the user
 * disabled protections), so `utils.isSafeListed` and anything else reading that setting follow native.
 *
 * Changes arrive as `ALLOWLIST_CHANGED_SUBSCRIPTION` events, which carry the whole list. On every background start
 * the extension also pulls the list, sending the version it holds so native answers with the list only when it
 * differs. That covers changes made while the extension was not loaded, or before an app restart. Both the list and
 * its version are kept in settings, which persist across background restarts.
 */
export class UserAllowlistSync {
    /**
     * @param {NativeMessagingInterface} nativeMessaging - messaging for the native `userAllowlist` feature
     * @param {object} [options]
     * @param {SettingsApi} [options.settingsApi] - defaults to the extension's settings
     */
    constructor(nativeMessaging, { settingsApi = settings } = {}) {
        this.nativeMessaging = nativeMessaging;
        this._settings = settingsApi;
        /** Counts received change events, so a pull that started before one can't overwrite it. */
        this._eventCount = 0;
        /** Settings can't be written until they have loaded, so updates wait for this, in the order they arrive. */
        this._settingsReady = Promise.resolve(settingsApi.ready());

        // Subscribed synchronously, so native can wake the background to deliver changes.
        nativeMessaging.subscribe(ALLOWLIST_CHANGED_SUBSCRIPTION, (params) => this._onChanged(params));

        this.ready = this._settingsReady.then(() => this._pull());
    }

    /**
     * Pulls the allowlist from native if it changed since the version held.
     */
    async _pull() {
        const eventCount = this._eventCount;
        let result;
        try {
            result = await this.nativeMessaging.request('getAllowlistIfNew', { version: this.version });
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
        this._settingsReady.then(() => this._update({ ...params, updated: true }));
    }

    /**
     * Stores a list from native in settings if it is well formed and new.
     * @param {any} result
     */
    _update(result) {
        if (!result?.updated || !Array.isArray(result.domains) || typeof result.version !== 'string') {
            return;
        }
        if (result.version === this.version) {
            return;
        }
        /** @type {Record<string, boolean>} */
        const allowlist = {};
        for (const domain of result.domains) {
            allowlist[domain] = true;
        }
        this._settings.updateSetting(ALLOWLIST_SETTING, allowlist);
        this._settings.updateSetting(ALLOWLIST_VERSION_SETTING, result.version);
    }

    /** @returns {string[]} */
    get domains() {
        return Object.keys(this._settings.getSetting(ALLOWLIST_SETTING) || {});
    }

    /** @returns {string | null} */
    get version() {
        return this._settings.getSetting(ALLOWLIST_VERSION_SETTING) ?? null;
    }
}

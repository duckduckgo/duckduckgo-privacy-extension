import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getUserLocale } from '../i18n';
import { NTP_PORT_NAME, NTP_MESSAGING_CONTEXT, NTP_FEATURE_NAME, NTP_OTHER_COMPANY_IDENTIFIER } from '../../ntp/constants';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 */

// Mirrors of the C-S-S NTP message types (special-pages/pages/new-tab/types/new-tab.ts).
// TODO: import them from C-S-S once new-tab.ts resolves outside C-S-S; its
// `declare module "../src/index.js"` augmentation currently breaks our tsc.
/**
 * @typedef {{ totalCount: number, totalCookiePopUpsBlocked?: number | null }} ProtectionsData
 * @typedef {{ displayName: string, count: number }} TrackerCompany
 * @typedef {{ trackerCompanies: TrackerCompany[] }} PrivacyStatsData
 */

/** Settings keys used to persist NTP UI configuration. */
const WIDGET_CONFIGS_SETTING = 'ntpWidgetConfigs';
const FAVORITES_CONFIG_SETTING = 'ntpFavoritesConfig';
const PROTECTIONS_CONFIG_SETTING = 'ntpProtectionsConfig';

const WIDGETS = [{ id: 'omnibar' }, { id: 'favorites' }, { id: 'protections' }];
const DEFAULT_WIDGET_CONFIGS = [
    { id: 'omnibar', visibility: 'visible' },
    { id: 'favorites', visibility: 'visible' },
    { id: 'protections', visibility: 'visible' },
];
// Search only: Duck.ai mode and its setting are hidden.
const OMNIBAR_CONFIG = {
    mode: 'search',
    enableAi: false,
    showAiSetting: false,
    enableRecentAiChats: false,
};
const DEFAULT_FAVORITES_CONFIG = { expansion: 'expanded' };
const DEFAULT_PROTECTIONS_CONFIG = { expansion: 'expanded', feed: 'privacy-stats' };

const SEARCH_URL = 'https://duckduckgo.com/';

/**
 * Messaging endpoint for the New Tab Page, over the runtime port opened by
 * shared/js/ntp/interop-shim.js:
 *  - requests arrive as `{Feature, SubFeatureName, Name, Data, Id}` and are
 *    answered with `{context, featureName, id, result|error}`;
 *  - subscription events are pushed to all connected pages as
 *    `{context, featureName, subscriptionName, params}`.
 *
 * Privacy stats come from NewTabTrackerStats; favorites, suggestions and the
 * activity feed are empty.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /** @type {ReturnType<typeof setTimeout>?} */
    pushTimer = null;

    /**
     * @param {{
     *  settings: Settings,
     *  newTabTrackerStats: NewTabTrackerStats,
     * }} options
     */
    constructor({ settings, newTabTrackerStats }) {
        this.settings = settings;
        this.newTabTrackerStats = newTabTrackerStats;

        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== NTP_PORT_NAME) return;
            this.ports.add(port);
            port.onMessage.addListener((msg) => {
                this.onMessage(msg, port);
            });
            port.onDisconnect.addListener(() => {
                this.ports.delete(port);
            });
        });

        // At most one push a second while trackers are being blocked.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            if (this.ports.size === 0 || this.pushTimer) return;
            this.pushTimer = setTimeout(() => {
                this.pushTimer = null;
                this.pushDataUpdate();
            }, 1000);
        });
    }

    /**
     * @param {any} msg
     * @param {Port} port
     */
    async onMessage(msg, port) {
        const { Feature: context, SubFeatureName: featureName, Name: method, Data: params, Id: id } = msg;
        if (context !== NTP_MESSAGING_CONTEXT || featureName !== NTP_FEATURE_NAME) {
            return;
        }
        if (id) {
            try {
                const result = await this.handleRequest(method, params);
                port.postMessage({ context, featureName, id, result });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                port.postMessage({ context, featureName, id, error: { message } });
            }
        } else {
            await this.handleNotification(method, params, port);
        }
    }

    /**
     * @param {string} method
     * @param {any} [params]
     * @returns {Promise<any>}
     */
    async handleRequest(method, params) {
        switch (method) {
            case 'initialSetup':
                await this.settings.ready();
                return {
                    widgets: WIDGETS,
                    widgetConfigs: this.settings.getSetting(WIDGET_CONFIGS_SETTING) || DEFAULT_WIDGET_CONFIGS,
                    platform: { name: 'windows' },
                    env: 'production',
                    locale: getUserLocale(),
                    updateNotification: null,
                };

            // Omnibar
            case 'omnibar_getConfig':
                return OMNIBAR_CONFIG;
            case 'omnibar_getSuggestions':
                return { suggestions: { topHits: [], duckduckgoSuggestions: [], localSuggestions: [] } };

            // Favorites
            case 'favorites_getConfig':
                await this.settings.ready();
                return this.settings.getSetting(FAVORITES_CONFIG_SETTING) || DEFAULT_FAVORITES_CONFIG;
            case 'favorites_getData':
                return { favorites: [] };

            // Protections
            case 'protections_getConfig':
                await this.settings.ready();
                return this.settings.getSetting(PROTECTIONS_CONFIG_SETTING) || DEFAULT_PROTECTIONS_CONFIG;
            case 'protections_getData':
                return this.getProtectionsData();
            case 'stats_getData':
                return this.getPrivacyStatsData();
            case 'activity_getUrls':
                return { urls: [], totalTrackersBlocked: 0 };
            case 'activity_getDataForUrls':
                return { activity: [] };

            default:
                throw new Error(`unhandled NTP request: ${method}`);
        }
    }

    /**
     * @param {string} method
     * @param {any} [params]
     * @param {Port} [port]
     */
    async handleNotification(method, params, port) {
        switch (method) {
            case 'widgets_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(WIDGET_CONFIGS_SETTING, params);
                break;

            // Omnibar
            case 'omnibar_submitSearch':
                if (typeof params?.term === 'string') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(params.term)}`, params?.target, port);
                }
                break;
            case 'omnibar_openSuggestion': {
                const suggestion = params?.suggestion;
                if (suggestion?.kind === 'phrase') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(suggestion.phrase)}`, params?.target, port);
                } else {
                    this.openUrl(suggestion?.url, params?.target, port);
                }
                break;
            }

            // Favorites
            case 'favorites_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(FAVORITES_CONFIG_SETTING, params);
                break;
            case 'favorites_open':
                this.openUrl(params?.url, params?.target, port);
                break;

            // Protections
            case 'protections_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(PROTECTIONS_CONFIG_SETTING, params);
                break;
            case 'activity_open':
                this.openUrl(params?.url, params?.target, port);
                break;

            case 'reportInitException':
            case 'reportPageException':
                console.error(`NTP ${method}:`, params?.message);
                break;
            default:
                // favorites_move/add/openContextMenu, activity_addFavorite/
                // removeFavorite/removeItem, telemetryEvent etc.
                console.log(`NTP notification (ignored): ${method}`, params);
        }
    }

    /**
     * @param {unknown} url
     * @param {string} [target] - 'same-tab' targets the NTP's own tab; otherwise a
     *   new tab opens directly to the right of the NTP
     * @param {Port} [port] - the connection the request arrived on
     */
    openUrl(url, target, port) {
        if (typeof url !== 'string') return;
        const tab = port?.sender?.tab;
        if (!tab?.id) {
            browser.tabs.create({ url });
        } else if (target === 'same-tab') {
            browser.tabs.update(tab.id, { url });
        } else {
            browser.tabs.create({ url, windowId: tab.windowId, index: tab.index + 1, openerTabId: tab.id });
        }
    }

    /**
     * @returns {ProtectionsData}
     */
    getProtectionsData() {
        return { totalCount: this.newTabTrackerStats.stats.totalCount };
    }

    /**
     * @returns {PrivacyStatsData}
     */
    getPrivacyStatsData() {
        const trackerCompanies = this.newTabTrackerStats.stats.sorted(Date.now()).map(({ key, count }) => ({
            displayName: key === NewTabTrackerStats.otherCompaniesKey ? NTP_OTHER_COMPANY_IDENTIFIER : key,
            count,
        }));
        // the page expects the aggregated 'other' entry at the end of the list
        const otherIndex = trackerCompanies.findIndex(({ displayName }) => displayName === NTP_OTHER_COMPANY_IDENTIFIER);
        if (otherIndex > -1) {
            trackerCompanies.push(...trackerCompanies.splice(otherIndex, 1));
        }
        return { trackerCompanies };
    }

    pushDataUpdate() {
        this.pushSubscriptionEvent('protections_onDataUpdate', this.getProtectionsData());
        this.pushSubscriptionEvent('stats_onDataUpdate', this.getPrivacyStatsData());
    }

    /**
     * @param {string} subscriptionName
     * @param {any} params
     */
    pushSubscriptionEvent(subscriptionName, params) {
        for (const port of this.ports) {
            port.postMessage({
                context: NTP_MESSAGING_CONTEXT,
                featureName: NTP_FEATURE_NAME,
                subscriptionName,
                params,
            });
        }
    }
}

import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getUserLocale, getFullUserLocale } from '../i18n';
import { getBaseDomain, extractHostFromURL } from '../utils';
import { trailingThrottle } from '../../shared-utils/trailing-throttle';
import { NTP_PORT_NAME, NTP_MESSAGING_CONTEXT, NTP_FEATURE_NAME, NTP_OTHER_COMPANY_IDENTIFIER } from '../../ntp/constants';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./ntp-activity.js').default} NTPActivityCollection
 * @typedef {import('../classes/ntp-activity-store.js').SiteActivityRow} SiteActivityRow
 * @typedef {import('../classes/ntp-favorites-store.js').NTPFavoritesStore} NTPFavoritesStore
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 */

/** Settings keys used to persist NTP UI configuration. */
const PROTECTIONS_CONFIG_SETTING = 'ntpProtectionsConfig';
const WIDGET_CONFIGS_SETTING = 'ntpWidgetConfigs';
const FAVORITES_CONFIG_SETTING = 'ntpFavoritesConfig';
const OMNIBAR_CONFIG_SETTING = 'ntpOmnibarConfig';

// Note: the standalone 'activity' (and 'privacyStats') widgets are empty
// stubs in the current content-scope-scripts release, so the activity feed is
// shown via the protections widget with its feed defaulted to 'activity'.
const WIDGETS = [{ id: 'omnibar' }, { id: 'favorites' }, { id: 'protections' }];
const DEFAULT_WIDGET_CONFIGS = [
    { id: 'omnibar', visibility: 'visible' },
    { id: 'favorites', visibility: 'visible' },
    { id: 'protections', visibility: 'visible' },
];
const DEFAULT_PROTECTIONS_CONFIG = {
    expansion: 'expanded',
    feed: 'activity',
    showBurnAnimation: false,
};
const DEFAULT_FAVORITES_CONFIG = { expansion: 'expanded' };
const DEFAULT_OMNIBAR_CONFIG = {
    mode: 'search',
    enableAi: true,
    enableRecentAiChats: false,
};

const SEARCH_URL = 'https://duckduckgo.com/';

/**
 * PoC messaging endpoint for the embedded New Tab Page (chromium-embedded
 * build only).
 *
 * The New Tab Page from @duckduckgo/content-scope-scripts is served as an
 * extension page (see the ntp/ directory of the build and
 * `chrome_url_overrides` in the manifest). Its 'windows' messaging transport
 * is bridged to the background over a runtime port by
 * shared/js/ntp/interop-shim.js, and this component answers those messages:
 *
 *  - requests arrive in the windows wire format
 *    `{Feature, SubFeatureName, Name, Data, Id}` and are answered with
 *    `{context, featureName, id, result|error}` on the same port;
 *  - subscription events are pushed to all connected NTP pages as
 *    `{context, featureName, subscriptionName, params}` - the page registers
 *    no subscriptions with us, it simply filters incoming events.
 *
 * Enabled widgets: 'omnibar' (searches go to duckduckgo.com), 'favorites'
 * (persisted in NTPFavoritesStore; sites are starred/unstarred from the
 * activity feed), and 'protections' - its summary
 * feed backed by the same aggregated tracker stats that power the
 * duckduckgo.com New Tab Page on Chrome (see NewTabTrackerStats), and its
 * activity ("Details") feed by the per-site stats collected in
 * NTPActivityCollection.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /**
     * @param {{
     *  settings: Settings,
     *  ntpActivity: NTPActivityCollection,
     *  newTabTrackerStats: NewTabTrackerStats,
     *  favoritesStore: NTPFavoritesStore,
     * }} options
     */
    constructor({ settings, ntpActivity, newTabTrackerStats, favoritesStore }) {
        this.settings = settings;
        this.ntpActivity = ntpActivity;
        this.newTabTrackerStats = newTabTrackerStats;
        this.favoritesStore = favoritesStore;
        this.schedulePushDataUpdate = trailingThrottle(() => this.pushDataUpdate(), 1000);

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

        // Push updated summary stats to any open NTPs as trackers are blocked.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            if (this.ports.size > 0) {
                this.schedulePushDataUpdate();
            }
        });

        // Push per-site patches to the activity feed as data is collected.
        this.ntpActivity.onChange((hosts) => {
            this.pushActivityPatches(hosts);
        });
    }

    /**
     * Handle one incoming message from the NTP page, in the windows wire
     * format produced by the page's WindowsMessagingTransport.
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
            case 'initialSetup': {
                await this.settings.ready();
                return {
                    widgets: WIDGETS,
                    widgetConfigs: this.settings.getSetting(WIDGET_CONFIGS_SETTING) || DEFAULT_WIDGET_CONFIGS,
                    platform: { name: 'windows' },
                    env: 'production',
                    locale: getUserLocale(),
                    updateNotification: null,
                };
            }
            case 'protections_getConfig': {
                await this.settings.ready();
                return this.settings.getSetting(PROTECTIONS_CONFIG_SETTING) || DEFAULT_PROTECTIONS_CONFIG;
            }
            case 'favorites_getConfig': {
                await this.settings.ready();
                return this.settings.getSetting(FAVORITES_CONFIG_SETTING) || DEFAULT_FAVORITES_CONFIG;
            }
            case 'favorites_getData':
                return await this.getFavoritesData();
            case 'omnibar_getConfig': {
                await this.settings.ready();
                return this.settings.getSetting(OMNIBAR_CONFIG_SETTING) || DEFAULT_OMNIBAR_CONFIG;
            }
            case 'omnibar_getSuggestions':
                // No suggestion sources are wired up yet.
                return { suggestions: { topHits: [], duckduckgoSuggestions: [], localSuggestions: [] } };
            case 'omnibar_getAiChats':
                // Recent Duck.ai chats are disabled in the omnibar config.
                return { chats: [] };
            case 'protections_getData':
                return this.getProtectionsData();
            case 'stats_getData':
                return this.getPrivacyStatsData();
            case 'activity_getData': {
                const rows = await this.ntpActivity.store.getAll();
                return { activity: await this.mapActivityRows(rows) };
            }
            case 'activity_getUrls':
                return await this.getActivityUrlInfo();
            case 'activity_getDataForUrls': {
                const rows = await this.ntpActivity.store.getForUrls(params?.urls || []);
                return { activity: await this.mapActivityRows(rows) };
            }
            case 'activity_confirmBurn':
                // Burning (fire button) is not wired up yet.
                return { action: 'none' };
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
            case 'protections_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(PROTECTIONS_CONFIG_SETTING, params);
                break;
            case 'widgets_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(WIDGET_CONFIGS_SETTING, params);
                break;
            case 'favorites_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(FAVORITES_CONFIG_SETTING, params);
                break;
            case 'favorites_move':
                if (await this.favoritesStore.move(params?.id, params?.targetIndex)) {
                    await this.pushFavoritesDataUpdate();
                }
                break;
            case 'favorites_add':
                // Sent by the widget's "Add Favorite" tile, which expects the
                // browser to show an add-favorite form - not supported yet.
                // Favorites are added by starring sites in the activity feed.
                console.log('NTP favorites_add: not supported (no native form)');
                break;
            case 'activity_addFavorite': {
                if (typeof params?.url === 'string') {
                    const host = extractHostFromURL(params.url, true);
                    await this.favoritesStore.add({ url: params.url, title: host });
                    await this.pushFavoritesDataUpdate();
                    // updates the star on the site's activity feed row
                    await this.pushActivityPatches([host]);
                }
                break;
            }
            case 'activity_removeFavorite': {
                if (typeof params?.url === 'string') {
                    await this.favoritesStore.remove(params.url);
                    await this.pushFavoritesDataUpdate();
                    await this.pushActivityPatches([extractHostFromURL(params.url, true)]);
                }
                break;
            }
            case 'omnibar_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(OMNIBAR_CONFIG_SETTING, params);
                break;
            case 'favorites_open':
                this.openUrl(params?.url, params?.target, port);
                break;
            case 'omnibar_submitSearch': {
                if (typeof params?.term === 'string') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(params.term)}`, params?.target, port);
                }
                break;
            }
            case 'omnibar_submitChat': {
                if (typeof params?.chat === 'string') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(params.chat)}&ia=chat`, params?.target, port);
                }
                break;
            }
            case 'omnibar_openAiChat':
                this.openUrl(`${SEARCH_URL}?ia=chat`, params?.target, port);
                break;
            case 'omnibar_openSuggestion': {
                const suggestion = params?.suggestion;
                if (suggestion?.kind === 'phrase') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(suggestion.phrase)}`, params?.target, port);
                } else if (typeof suggestion?.url === 'string') {
                    this.openUrl(suggestion.url, params?.target, port);
                }
                break;
            }
            case 'activity_removeItem': {
                if (typeof params?.url === 'string') {
                    await this.ntpActivity.store.removeByUrl(params.url);
                    await this.pushActivityDataUpdate();
                }
                break;
            }
            case 'open':
                this.openUrl(params?.url, params?.target, port);
                break;
            case 'reportInitException':
            case 'reportPageException':
                console.error(`NTP ${method}:`, params?.message);
                break;
            default:
                // telemetryEvent, contextMenu, favorites, stats_showMore/showLess
                // etc. - accepted but not acted upon yet.
                console.log(`NTP notification (ignored): ${method}`, params);
        }
    }

    /**
     * Open a URL as requested by the NTP.
     * @param {unknown} url
     * @param {string} [target] - 'same-tab' targets the NTP's own tab
     * @param {Port} [port] - the connection the request arrived on
     */
    openUrl(url, target, port) {
        if (typeof url !== 'string') return;
        const tabId = port?.sender?.tab?.id;
        if (target === 'same-tab' && tabId) {
            browser.tabs.update(tabId, { url });
        } else {
            browser.tabs.create({ url });
        }
    }

    /**
     * @returns {{ totalCount: number }}
     */
    getProtectionsData() {
        return { totalCount: this.newTabTrackerStats.stats.totalCount };
    }

    /**
     * @returns {{ trackerCompanies: { displayName: string, count: number }[] }}
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

    /**
     * The favorites in the widget's data format.
     * @returns {Promise<{ favorites: object[] }>}
     */
    async getFavoritesData() {
        const favorites = await this.favoritesStore.getAll();
        return {
            favorites: favorites.map((favorite) => ({
                ...favorite,
                etldPlusOne: getBaseDomain(favorite.url) || null,
                favicon: faviconFor(favorite.url, 64),
            })),
        };
    }

    async pushFavoritesDataUpdate() {
        if (this.ports.size === 0) return;
        this.pushSubscriptionEvent('favorites_onDataUpdate', await this.getFavoritesData());
    }

    /**
     * Map stored site rows to the activity feed's format, marking favorites.
     * @param {SiteActivityRow[]} rows
     */
    async mapActivityRows(rows) {
        const favoriteUrls = await this.favoritesStore.getUrls();
        const now = Date.now();
        return rows.map((row) => toDomainActivity(row, now, favoriteUrls));
    }

    /**
     * The site URL list + total for the activity feed's batched API. The
     * total is the last-7-days count (the store's retention window), unlike
     * protections_getData's install-time total.
     * @param {SiteActivityRow[]} [rows] - pass the rows if already fetched
     * @returns {Promise<{ urls: string[], totalTrackersBlocked: number }>}
     */
    async getActivityUrlInfo(rows) {
        rows = rows || (await this.ntpActivity.store.getAll());
        return {
            urls: rows.map((row) => row.url),
            totalTrackersBlocked: rows.reduce((total, row) => total + row.totalCount, 0),
        };
    }

    /**
     * Push single-site activity patches to connected NTP pages. The page's
     * patch protocol carries one site per event, so multiple changed hosts
     * result in one event each (all derived from a single store read).
     * @param {string[]} hosts
     */
    async pushActivityPatches(hosts) {
        if (this.ports.size === 0) return;
        const rows = await this.ntpActivity.store.getAll();
        const urlInfo = await this.getActivityUrlInfo(rows);
        const favoriteUrls = await this.favoritesStore.getUrls();
        for (const host of hosts) {
            const row = rows.find((r) => r.host === host);
            this.pushSubscriptionEvent('activity_onDataPatch', {
                ...urlInfo,
                patch: row ? toDomainActivity(row, Date.now(), favoriteUrls) : null,
            });
        }
    }

    /**
     * Push a full activity data update (e.g. after an item was removed).
     */
    async pushActivityDataUpdate() {
        if (this.ports.size === 0) return;
        const rows = await this.ntpActivity.store.getAll();
        this.pushSubscriptionEvent('activity_onDataUpdate', {
            activity: await this.mapActivityRows(rows),
        });
    }

    /**
     * Push the summary feed's data (scheduled via the trailing-throttled
     * schedulePushDataUpdate, so bursts of blocked trackers result in a
     * single update to the page).
     */
    pushDataUpdate() {
        this.pushSubscriptionEvent('protections_onDataUpdate', this.getProtectionsData());
        this.pushSubscriptionEvent('stats_onDataUpdate', this.getPrivacyStatsData());
    }

    /**
     * Broadcast a subscription event to all connected NTP pages.
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

/**
 * Map a stored site row to the NTP's DomainActivity format.
 * @param {SiteActivityRow} row
 * @param {number} [now] - current timestamp, overridable for tests
 * @param {Set<string>} [favoriteUrls] - urls the user has favorited
 */
export function toDomainActivity(row, now = Date.now(), favoriteUrls = new Set()) {
    const trackerCompanies = Object.entries(row.companies)
        .sort((a, b) => b[1] - a[1])
        .map(([displayName]) => ({ displayName }));
    return {
        title: row.host,
        url: row.url,
        etldPlusOne: row.etldPlusOne,
        favicon: faviconFor(row.url, 32),
        trackingStatus: {
            totalCount: row.totalCount,
            trackerCompanies,
        },
        trackersFound: row.totalCount > 0,
        history: row.history.map((entry) => ({
            title: entry.title,
            url: entry.url,
            relativeTime: formatRelativeTime(entry.visitedAt, now),
        })),
        favorite: favoriteUrls.has(row.url),
        cookiePopUpBlocked: null,
    };
}

/**
 * A favicon reference the page can load, via Chromium's favicon API (relative
 * to the NTP extension page; requires the 'favicon' permission in the
 * manifest).
 * Note: the page appends '?preferredSize=N' verbatim to this src (see
 * FaviconWithState in content-scope-scripts), which would corrupt the size
 * parameter - the trailing '&' absorbs it as an extra (ignored) query
 * parameter instead.
 * @param {string} pageUrl
 * @param {number} size
 * @returns {{ src: string, maxAvailableSize: number }}
 */
function faviconFor(pageUrl, size) {
    return {
        src: `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}&`,
        maxAvailableSize: size,
    };
}

/** @type {Intl.RelativeTimeFormat?} */
let relativeTimeFormatter = null;

/**
 * Format a timestamp as a localized, human readable relative time
 * (e.g. "now", "5 minutes ago", "yesterday").
 * @param {number} timestamp
 * @param {number} [now]
 * @returns {string}
 */
export function formatRelativeTime(timestamp, now = Date.now()) {
    if (!relativeTimeFormatter) {
        relativeTimeFormatter = new Intl.RelativeTimeFormat(getFullUserLocale(), { numeric: 'auto' });
    }
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) {
        return relativeTimeFormatter.format(0, 'second');
    }
    if (seconds < 60 * 60) {
        return relativeTimeFormatter.format(-Math.round(seconds / 60), 'minute');
    }
    if (seconds < 24 * 60 * 60) {
        return relativeTimeFormatter.format(-Math.round(seconds / (60 * 60)), 'hour');
    }
    return relativeTimeFormatter.format(-Math.round(seconds / (24 * 60 * 60)), 'day');
}

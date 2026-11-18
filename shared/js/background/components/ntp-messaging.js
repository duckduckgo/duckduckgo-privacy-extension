import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getUserLocale } from '../i18n';
import { getBaseDomain } from '../utils';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';
import { pageDomain } from './ntp-activity';
import {
    NTP_PORT_NAME,
    NTP_RECONNECT_MESSAGE,
    NTP_MESSAGING_CONTEXT,
    NTP_FEATURE_NAME,
    NTP_OTHER_COMPANY_IDENTIFIER,
} from '../../ntp/constants';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import('./ntp-activity').default} NTPActivity
 * @typedef {import('./ntp-activity').SiteActivity} SiteActivity
 */

// Mirrors of the C-S-S NTP message types (special-pages/pages/new-tab/types/new-tab.ts).
// TODO: import them from C-S-S once new-tab.ts resolves outside C-S-S; its
// `declare module "../src/index.js"` augmentation currently breaks our tsc.
/**
 * @typedef {{ id: string, visibility: 'visible' | 'hidden' }} WidgetConfig
 * @typedef {{ totalCount: number, totalCookiePopUpsBlocked?: number | null }} ProtectionsData
 * @typedef {{ displayName: string, count: number }} TrackerCompany
 * @typedef {{ trackerCompanies: TrackerCompany[] }} PrivacyStatsData
 * @typedef {{ urls: string[], totalTrackersBlocked: number }} UrlInfo
 * @typedef {{
 *  title: string,
 *  url: string,
 *  etldPlusOne: string,
 *  favicon: null | { src: string, maxAvailableSize?: number },
 *  trackingStatus: { trackerCompanies: { displayName: string }[], totalCount: number },
 *  trackersFound: boolean,
 *  history: { title: string, url: string, relativeTime: string }[],
 *  favorite: boolean,
 * }} DomainActivity
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
const FAVICON_SIZE = 64;
/** The most pages the page lists for a site. */
const MAX_SITE_HISTORY = 10;
const relativeTimeFormat = new Intl.RelativeTimeFormat(getUserLocale());
const JUST_NOW = new Intl.RelativeTimeFormat(getUserLocale(), { numeric: 'auto' }).format(0, 'second');
/** Session storage key for the favorite URLs the activity feed's stars were last given. */
const STARRED_URLS_KEY = 'ntpStarredUrls';

/**
 * `chrome.ddg`; throws where the browser does not provide it.
 */
function ddgApi() {
    if (!chrome.ddg) {
        throw new Error('chrome.ddg is unavailable');
    }
    return chrome.ddg;
}

/**
 * Messaging endpoint for the New Tab Page, over the runtime port opened by
 * shared/js/ntp/interop-shim.js:
 *  - requests arrive as `{Feature, SubFeatureName, Name, Data, Id}` and are
 *    answered with `{context, featureName, id, result|error}`;
 *  - subscription events are pushed to all connected pages as
 *    `{context, featureName, subscriptionName, params}`.
 *
 * Privacy stats come from NewTabTrackerStats, favorites from the browser's
 * bookmarks over chrome.ddg and the activity feed from NTPActivity; suggestions
 * are empty.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /** @type {ReturnType<typeof setTimeout>?} */
    pushTimer = null;

    /** @type {ReturnType<typeof setTimeout>?} */
    activityPushTimer = null;

    /**
     * Domains whose activity changed since the last activity push.
     * @type {Set<string>}
     */
    changedDomains = new Set();

    /**
     * @param {{
     *  settings: Settings,
     *  newTabTrackerStats: NewTabTrackerStats,
     *  statsRestored?: Promise<void>,
     *  ntpActivity: NTPActivity,
     * }} options - `statsRestored` resolves once `newTabTrackerStats` has been restored from storage
     */
    constructor({ settings, newTabTrackerStats, statsRestored = Promise.resolve(), ntpActivity }) {
        this.settings = settings;
        this.newTabTrackerStats = newTabTrackerStats;
        this.ntpActivity = ntpActivity;

        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== NTP_PORT_NAME) return;
            this.ports.add(port);
            port.onMessage.addListener((msg) => {
                this.onMessage(msg, port);
            });
            port.onDisconnect.addListener(() => {
                this.ports.delete(port);
            });
            // Favorites may have changed while a reconnecting page had no port.
            this.pushFavoritesUpdate([port]);
        });

        // Top level, so the browser can wake the worker to deliver it.
        if (chrome.ddg?.onFavoritesChanged) {
            chrome.ddg.onFavoritesChanged.addListener(async () => {
                try {
                    const [, favoriteUrls] = await Promise.all([this.pushFavoritesUpdate(), getFavoriteUrls()]);
                    const starred = await swapStarredUrls(favoriteUrls);
                    const changed = [...favoriteUrls, ...starred].filter((url) => favoriteUrls.has(url) !== starred.has(url));
                    this.queueActivityPush(changed.map(pageDomain));
                } catch (e) {
                    console.error('NTP activity_onDataPatch failed:', e);
                }
            });
        } else {
            console.error('chrome.ddg.onFavoritesChanged is unavailable: open New Tab Pages will not see favorites change');
        }

        // At most one push a second while trackers are being blocked. Scheduled even with no
        // pages connected, as open pages reconnect after the event that started the worker.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            if (this.pushTimer) return;
            this.pushTimer = setTimeout(() => {
                this.pushTimer = null;
                this.pushDataUpdate();
            }, 1000);
        });

        ntpActivity.addEventListener('change', (event) => this.queueActivityPush(/** @type {CustomEvent<string[]>} */ (event).detail));

        // As on Windows, a burn empties the tracker total and company list, here and in
        // storage, and pushes that at once. Not before the restore, which would undo it.
        if (chrome.ddg?.onBurnStarted) {
            chrome.ddg.onBurnStarted.addListener(async () => {
                await statsRestored;
                newTabTrackerStats.stats.clearAll();
                this.pushDataUpdate();
                await newTabTrackerStats.syncToStorage();
            });
        } else {
            console.error('chrome.ddg.onBurnStarted is unavailable: New Tab Pages will keep their tracker stats through a burn');
        }

        // Pages left open while the service worker was stopped have lost their port.
        browser.runtime.sendMessage({ [NTP_RECONNECT_MESSAGE]: true }).catch(() => {});
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
            try {
                await this.handleNotification(method, params, port);
            } catch (e) {
                console.error(`NTP ${method} failed:`, e);
            }
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
                    widgetConfigs: this.getWidgetConfigs(),
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
                return this.getFavoritesData();

            // Protections
            case 'protections_getConfig':
                await this.settings.ready();
                return this.settings.getSetting(PROTECTIONS_CONFIG_SETTING) || DEFAULT_PROTECTIONS_CONFIG;
            case 'protections_getData':
                return this.getProtectionsData();
            case 'stats_getData':
                return this.getPrivacyStatsData();
            case 'activity_getUrls':
                return toUrlInfo(await this.ntpActivity.getSites());
            case 'activity_getDataForUrls':
                return this.getActivityData(params?.urls);

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
                this.setWidgetConfigs(params);
                break;
            case 'contextMenu': {
                const tabId = port?.sender?.tab?.id;
                const items = params?.visibilityMenuItems;
                if (tabId === undefined || !Array.isArray(items)) {
                    throw new Error('the context menu has no tab to open over or no items');
                }
                await this.settings.ready();
                const configs = this.getWidgetConfigs();
                const chosen = await ddgApi().showContextMenu(
                    tabId,
                    items.map(({ id, title }) => ({
                        id,
                        title,
                        checked: configs.some((config) => config.id === id && config.visibility === 'visible'),
                    })),
                );
                if (chosen) {
                    // Toggles the widget in the config as it is once the menu closes.
                    this.setWidgetConfigs(
                        this.getWidgetConfigs().map((config) =>
                            config.id === chosen
                                ? { ...config, visibility: config.visibility === 'visible' ? 'hidden' : 'visible' }
                                : config,
                        ),
                    );
                }
                break;
            }

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
                this.openUrl(params?.url, params?.target, port, false);
                break;
            case 'favorites_move':
                // The page has already moved it; onFavoritesChanged echoes the order back.
                if (typeof params?.id === 'string' && Number.isInteger(params?.targetIndex)) {
                    try {
                        await ddgApi().moveFavorite(params.id, params.targetIndex);
                    } catch (e) {
                        // Undo the page's move.
                        await this.pushFavoritesUpdate();
                        throw e;
                    }
                }
                break;
            case 'favorites_add': {
                // The browser's bookmark dialog adds it; onFavoritesChanged brings it back.
                const tabId = port?.sender?.tab?.id;
                if (tabId === undefined || !(await ddgApi().showAddFavoriteBubble(tabId))) {
                    throw new Error('the add favorite dialog did not open');
                }
                break;
            }

            // Protections
            case 'protections_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(PROTECTIONS_CONFIG_SETTING, params);
                // As on Windows, every open page is sent the new config, the sender included.
                this.pushSubscriptionEvent('protections_onConfigUpdate', params);
                break;
            case 'activity_open':
                this.openUrl(params?.url, params?.target, port, false);
                break;
            case 'activity_removeItem':
                await this.ntpActivity.removeDomain(pageDomain(params?.url));
                break;
            // The page has already toggled the star; pushing the site puts it back if that fails.
            case 'activity_addFavorite':
                if (typeof params?.url === 'string') {
                    const domain = pageDomain(params.url);
                    const site = (await this.ntpActivity.getSites()).get(domain);
                    // A new bookmark is titled like the site's latest page, as on Windows.
                    const title = site?.pages[0].title.trim() || domain;
                    try {
                        await ddgApi().addFavorite(params.url, title);
                    } catch (e) {
                        this.queueActivityPush([domain]);
                        throw e;
                    }
                }
                break;
            case 'activity_removeFavorite':
                if (typeof params?.url === 'string') {
                    try {
                        await ddgApi().removeFavorite(params.url);
                    } catch (e) {
                        this.queueActivityPush([pageDomain(params.url)]);
                        throw e;
                    }
                }
                break;

            case 'reportInitException':
            case 'reportPageException':
                console.error(`NTP ${method}:`, params?.message);
                break;
            default:
                // favorites_openContextMenu, telemetryEvent etc.
                console.log(`NTP notification (ignored): ${method}`, params);
        }
    }

    /**
     * @param {unknown} url
     * @param {string} [target] - 'same-tab' targets the NTP's own tab and 'new-window' a
     *   new window; otherwise a new tab opens directly to the right of the NTP
     * @param {Port} [port] - the connection the request arrived on
     * @param {boolean} [active] - whether that new tab is selected
     */
    openUrl(url, target, port, active = true) {
        if (typeof url !== 'string') return;
        const tab = port?.sender?.tab;
        if (target === 'new-window') {
            browser.windows.create({ url });
        } else if (!tab?.id) {
            browser.tabs.create({ url, active });
        } else if (target === 'same-tab') {
            browser.tabs.update(tab.id, { url });
        } else {
            browser.tabs.create({ url, active, windowId: tab.windowId, index: tab.index + 1, openerTabId: tab.id });
        }
    }

    /**
     * @returns {WidgetConfig[]}
     */
    getWidgetConfigs() {
        return this.settings.getSetting(WIDGET_CONFIGS_SETTING) || DEFAULT_WIDGET_CONFIGS;
    }

    /**
     * As on Windows, every open page is sent the new config, the sender included.
     * @param {WidgetConfig[]} configs
     */
    setWidgetConfigs(configs) {
        this.settings.updateSetting(WIDGET_CONFIGS_SETTING, configs);
        this.pushSubscriptionEvent('widgets_onConfigUpdated', configs);
    }

    /**
     * @returns {ProtectionsData}
     */
    getProtectionsData() {
        // null: the current report UI, without cookie pop-up stats
        return { totalCount: this.newTabTrackerStats.stats.totalCount, totalCookiePopUpsBlocked: null };
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

    /**
     * Favorites in the page's format.
     */
    async getFavoritesData() {
        const favorites = await ddgApi().getFavorites();
        return {
            favorites: favorites.map(({ id, title, url }) => ({
                id,
                title,
                url,
                etldPlusOne: getBaseDomain(url),
                favicon: favicon(url),
            })),
        };
    }

    /**
     * @param {Iterable<Port>} [ports]
     */
    async pushFavoritesUpdate(ports = this.ports) {
        try {
            this.pushSubscriptionEvent('favorites_onDataUpdate', await this.getFavoritesData(), ports);
        } catch (e) {
            console.error('NTP favorites_onDataUpdate failed:', e);
        }
    }

    /**
     * @param {unknown} urls - site URLs, as listed by activity_getUrls
     * @returns {Promise<{ activity: DomainActivity[] }>}
     */
    async getActivityData(urls) {
        const [sites, favoriteUrls] = await Promise.all([this.ntpActivity.getSites(), getFavoriteUrls()]);
        await setToSessionStorage(STARRED_URLS_KEY, [...favoriteUrls]);
        const activity = [];
        for (const url of Array.isArray(urls) ? urls : []) {
            const domain = pageDomain(url);
            const site = sites.get(domain);
            if (site) {
                activity.push(toDomainActivity(url, domain, site, favoriteUrls.has(url)));
            }
        }
        return { activity };
    }

    pushDataUpdate() {
        this.pushSubscriptionEvent('protections_onDataUpdate', this.getProtectionsData());
        this.pushSubscriptionEvent('stats_onDataUpdate', this.getPrivacyStatsData());
    }

    /**
     * Push the activity of the given domains within a second, at most one push a second.
     * @param {string[]} domains
     */
    queueActivityPush(domains) {
        domains.forEach((domain) => this.changedDomains.add(domain));
        this.activityPushTimer ||= setTimeout(() => {
            this.activityPushTimer = null;
            const changed = [...this.changedDomains];
            this.changedDomains.clear();
            this.pushActivityUpdate(changed).catch((e) => console.error('NTP activity_onDataPatch failed:', e));
        }, 1000);
    }

    /**
     * Push the activity feed's URLs, with each of the given domains that still
     * has activity as a patch.
     * @param {string[]} changedDomains
     */
    async pushActivityUpdate(changedDomains) {
        if (this.ports.size === 0) return;
        const [sites, favoriteUrls] = await Promise.all([this.ntpActivity.getSites(), getFavoriteUrls()]);
        const urlInfo = toUrlInfo(sites);
        let patched = false;
        for (const domain of new Set(changedDomains)) {
            const site = sites.get(domain);
            if (!site) continue;
            const url = siteUrl(domain, site);
            this.pushSubscriptionEvent('activity_onDataPatch', {
                ...urlInfo,
                patch: toDomainActivity(url, domain, site, favoriteUrls.has(url)),
            });
            patched = true;
        }
        if (!patched) {
            this.pushSubscriptionEvent('activity_onDataPatch', urlInfo);
        }
    }

    /**
     * @param {string} subscriptionName
     * @param {any} params
     * @param {Iterable<Port>} [ports]
     */
    pushSubscriptionEvent(subscriptionName, params, ports = this.ports) {
        for (const port of ports) {
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
 * The URL the page knows a domain by: https unless none of its pages are.
 * @param {string} domain
 * @param {SiteActivity} site
 * @returns {string}
 */
function siteUrl(domain, site) {
    return `${site.pages.some((page) => page.url.startsWith('https:')) ? 'https' : 'http'}://${domain}/`;
}

/**
 * @param {Map<string, SiteActivity>} sites
 * @returns {UrlInfo}
 */
function toUrlInfo(sites) {
    const urls = [];
    let totalTrackersBlocked = 0;
    for (const [domain, site] of sites) {
        urls.push(siteUrl(domain, site));
        totalTrackersBlocked += site.trackersBlocked;
    }
    return { urls, totalTrackersBlocked };
}

/**
 * @param {string} url - the site URL the page knows the domain by
 * @param {string} domain
 * @param {SiteActivity} site
 * @param {boolean} favorite
 * @returns {DomainActivity}
 */
function toDomainActivity(url, domain, site, favorite) {
    return {
        title: domain,
        url,
        etldPlusOne: getBaseDomain(url) || domain,
        favicon: favicon(site.pages[0].url),
        trackingStatus: {
            totalCount: site.trackersBlocked,
            trackerCompanies: site.companies.map((displayName) => ({ displayName })),
        },
        trackersFound: site.trackersFound,
        history: site.pages
            .filter((page) => page.title.trim())
            .slice(0, MAX_SITE_HISTORY)
            .map((page) => ({ title: page.title, url: page.url, relativeTime: relativeTime(page.lastVisitTime) })),
        favorite,
    };
}

/**
 * @returns {Promise<Set<string>>} the URLs of the favorites the browser shows
 */
async function getFavoriteUrls() {
    return new Set((await ddgApi().getFavorites()).map(({ url }) => url));
}

/**
 * Records `favoriteUrls` as the activity feed's stars. Kept for the session, as
 * the favorites change that wakes the worker must be compared with the stars the
 * page was given before it stopped.
 * @param {Set<string>} favoriteUrls
 * @returns {Promise<Set<string>>} the stars recorded before
 */
async function swapStarredUrls(favoriteUrls) {
    const starred = new Set((await getFromSessionStorage(STARRED_URLS_KEY)) || []);
    await setToSessionStorage(STARRED_URLS_KEY, [...favoriteUrls]);
    return starred;
}

/**
 * A page's icon from Chromium's favicon cache (the `favicon` permission). The page
 * appends `?preferredSize=N` to `src` verbatim; the trailing '&' keeps that out of `size`.
 * @param {string} pageUrl
 */
function favicon(pageUrl) {
    return { src: `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${FAVICON_SIZE}&`, maxAvailableSize: FAVICON_SIZE };
}

/**
 * @param {number} time - in the past
 * @returns {string} e.g. "5 minutes ago"
 */
function relativeTime(time) {
    const minutes = Math.floor((Date.now() - time) / 60000);
    if (minutes < 1) return JUST_NOW;
    if (minutes < 60) return relativeTimeFormat.format(-minutes, 'minute');
    if (minutes < 24 * 60) return relativeTimeFormat.format(-Math.floor(minutes / 60), 'hour');
    return relativeTimeFormat.format(-Math.floor(minutes / (24 * 60)), 'day');
}

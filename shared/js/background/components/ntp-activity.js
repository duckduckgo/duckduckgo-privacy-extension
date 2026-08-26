import browser from 'webextension-polyfill';
import { NTPActivityStore } from '../classes/ntp-activity-store';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getBaseDomain, extractHostFromURL } from '../utils';
import { createAlarm } from '../wrapper';
import { trailingThrottle } from '../../shared-utils/trailing-throttle';

const PRUNE_ALARM_NAME = 'pruneNtpActivity';
const PRUNE_PERIOD_MINUTES = 60;
/** Trailing throttle for buffered blocked-tracker writes. */
const FLUSH_INTERVAL_MS = 1000;

/**
 * Collects per-site browsing activity for the embedded New Tab Page's
 * activity ("Details") feed - chromium-embedded build only.
 *
 * Page visits are recorded from main-frame navigations (http(s), regular
 * windows only - incognito is excluded), and blocked tracking attempts are
 * attributed to the visited site via the TrackerBlockedEvent published by
 * before-request.js. Everything is persisted in the IndexedDB-backed
 * NTPActivityStore, which keeps the last 7 days.
 *
 * Blocked-tracker events can arrive in quick bursts, so the counts are
 * buffered in memory and flushed on a trailing throttle. Consumers (see
 * components/ntp-messaging.js) can register an onChange callback to be told
 * which sites' data changed after each write.
 *
 * TODO: this store overlaps with the aggregated NewTabTrackerStats data (the
 * summary feed) - the summary could eventually be derived from this store so
 * the two feeds cannot drift.
 */
export default class NTPActivityCollection {
    /**
     * Sites currently loaded in each (non-incognito) tab. Blocked-tracker
     * events are only counted while the event's tab still shows the same
     * host, mirroring the sameDomainDocument check in before-request.js.
     * `lastTitle` avoids redundant store writes for repeated title updates.
     * @type {Map<number, { host: string, etldPlusOne: string, lastTitle?: string }>}
     */
    tabSites = new Map();

    /**
     * Buffered blocked-tracker counts by host.
     * @type {Map<string, { etldPlusOne: string, counts: Record<string, number> }>}
     */
    pendingCounts = new Map();

    /** @type {((hosts: string[]) => void)[]} */
    _changeCallbacks = [];

    /**
     * @param {object} [options]
     * @param {NTPActivityStore} [options.store] - overridable for tests
     */
    constructor({ store } = {}) {
        this.store = store || new NTPActivityStore();
        this.scheduleFlush = trailingThrottle(() => this.flushPendingCounts(), FLUSH_INTERVAL_MS);

        browser.webNavigation.onCommitted.addListener((details) => {
            if (details.frameId !== 0) return;
            this.handleNavigation(details.tabId, details.url);
        });

        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.title && tab.url) {
                this.handleTitleChange(tabId, tab.url, changeInfo.title);
            }
        });

        browser.tabs.onRemoved.addListener((tabId) => {
            this.tabSites.delete(tabId);
        });

        emitter.on(TrackerBlockedEvent.eventName, (event) => {
            if (!(event instanceof TrackerBlockedEvent)) return;
            this.handleTrackerBlocked(event);
        });

        createAlarm(PRUNE_ALARM_NAME, { periodInMinutes: PRUNE_PERIOD_MINUTES });
        browser.alarms.onAlarm.addListener((alarmEvent) => {
            if (alarmEvent.name === PRUNE_ALARM_NAME) {
                this.store.prune();
            }
        });

        // tabSites is in-memory only, so seed it with the currently open tabs
        // after a service worker restart - otherwise blocked trackers on
        // already-open tabs would go unattributed until their next navigation.
        // No store writes here: the visits were recorded when they happened.
        this.ready = this.restoreTabSites();
    }

    async restoreTabSites() {
        const tabs = await browser.tabs.query({});
        for (const tab of tabs) {
            if (tab.id === undefined || tab.incognito || !tab.url) continue;
            const host = siteHost(tab.url);
            if (host === '') continue;
            if (!this.tabSites.has(tab.id)) {
                this.tabSites.set(tab.id, { host, etldPlusOne: getBaseDomain(tab.url) || host });
            }
        }
    }

    /**
     * Register a callback for when site data changes, called with the hosts
     * that were updated (after the writes have been committed).
     * @param {(hosts: string[]) => void} callback
     */
    onChange(callback) {
        this._changeCallbacks.push(callback);
    }

    /**
     * @param {string[]} hosts
     */
    _notifyChange(hosts) {
        for (const callback of this._changeCallbacks) {
            callback(hosts);
        }
    }

    /**
     * @param {number} tabId
     * @param {string} url
     */
    async handleNavigation(tabId, url) {
        const host = siteHost(url);
        if (host === '') {
            this.tabSites.delete(tabId);
            return;
        }
        let tab;
        try {
            tab = await browser.tabs.get(tabId);
        } catch (e) {
            return; // tab already gone
        }
        if (tab.incognito) {
            this.tabSites.delete(tabId);
            return;
        }
        const etldPlusOne = getBaseDomain(url) || host;
        this.tabSites.set(tabId, { host, etldPlusOne });
        // The page title usually isn't known at commit time; it's filled in
        // by handleTitleChange when the tab's title updates.
        await this.store.recordVisit({ host, etldPlusOne, url, timestamp: Date.now() });
        this._notifyChange([host]);
    }

    /**
     * @param {number} tabId
     * @param {string} url
     * @param {string} title
     */
    async handleTitleChange(tabId, url, title) {
        const site = this.tabSites.get(tabId);
        if (!site || siteHost(url) !== site.host || site.lastTitle === title) return;
        site.lastTitle = title;
        const updated = await this.store.updateTitle(site.host, url, title);
        if (updated) {
            this._notifyChange([site.host]);
        }
    }

    /**
     * @param {TrackerBlockedEvent} event
     */
    handleTrackerBlocked(event) {
        if (typeof event.tabId !== 'number' || !event.tabHost) return;
        const site = this.tabSites.get(event.tabId);
        // Only count events for sites we're tracking (i.e. visits recorded in
        // a regular window), and only while the tab still shows that site.
        if (!site || site.host !== event.tabHost) return;

        const pending = this.pendingCounts.get(site.host) || { etldPlusOne: site.etldPlusOne, counts: {} };
        pending.counts[event.companyDisplayName] = (pending.counts[event.companyDisplayName] || 0) + 1;
        this.pendingCounts.set(site.host, pending);
        this.scheduleFlush();
    }

    async flushPendingCounts() {
        if (this.pendingCounts.size === 0) return;
        const pending = this.pendingCounts;
        this.pendingCounts = new Map();
        const updates = [...pending].map(([host, { etldPlusOne, counts }]) => ({ host, etldPlusOne, counts }));
        await this.store.recordBlockedTrackers(updates);
        this._notifyChange(updates.map(({ host }) => host));
    }
}

/**
 * The full hostname (www. kept, lowercase) a page's activity is grouped
 * under, or '' for non-http(s)/invalid URLs. The same derivation is used by
 * the store's url->host mapping and (via Site.domainWWW) the tabHost carried
 * on TrackerBlockedEvent.
 * @param {string} url
 * @returns {string}
 */
function siteHost(url) {
    if (!/^https?:\/\//.test(url)) return '';
    return extractHostFromURL(url, true).toLowerCase();
}

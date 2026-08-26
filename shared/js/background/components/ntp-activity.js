import browser from 'webextension-polyfill';
import { NTPActivityStore } from '../classes/ntp-activity-store';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getBaseDomain } from '../utils';
import { createAlarm } from '../wrapper';

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
 */
export default class NTPActivityCollection {
    /**
     * Sites currently loaded in each (non-incognito) tab. Blocked-tracker
     * events are only counted while the event's tab still shows the same
     * host, mirroring the sameDomainDocument check in before-request.js.
     * @type {Map<number, { host: string, etldPlusOne: string }>}
     */
    tabSites = new Map();

    /**
     * Buffered blocked-tracker counts: host -> company displayName -> count.
     * @type {Map<string, Record<string, number>>}
     */
    pendingCounts = new Map();

    /** @type {Map<string, string>} etldPlusOne for hosts with pending counts */
    pendingSiteInfo = new Map();

    /** @type {ReturnType<typeof setTimeout>?} */
    _flushTimer = null;

    /** @type {((hosts: string[]) => void)[]} */
    _changeCallbacks = [];

    /**
     * @param {object} [options]
     * @param {NTPActivityStore} [options.store] - overridable for tests
     */
    constructor({ store } = {}) {
        this.store = store || new NTPActivityStore();

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
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return;
        }
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
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
        const host = parsedUrl.hostname.toLowerCase();
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
        if (!site) return;
        let host;
        try {
            host = new URL(url).hostname.toLowerCase();
        } catch (e) {
            return;
        }
        if (host !== site.host) return;
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

        const counts = this.pendingCounts.get(site.host) || {};
        counts[event.companyDisplayName] = (counts[event.companyDisplayName] || 0) + 1;
        this.pendingCounts.set(site.host, counts);
        this.pendingSiteInfo.set(site.host, site.etldPlusOne);

        if (!this._flushTimer) {
            this._flushTimer = setTimeout(() => {
                this._flushTimer = null;
                this.flushPendingCounts();
            }, FLUSH_INTERVAL_MS);
        }
    }

    async flushPendingCounts() {
        const pending = this.pendingCounts;
        const siteInfo = this.pendingSiteInfo;
        this.pendingCounts = new Map();
        this.pendingSiteInfo = new Map();
        const hosts = [];
        for (const [host, companyCounts] of pending) {
            const etldPlusOne = siteInfo.get(host) || host;
            await this.store.recordBlockedTrackers({ host, etldPlusOne }, companyCounts);
            hosts.push(host);
        }
        if (hosts.length) {
            this._notifyChange(hosts);
        }
    }
}

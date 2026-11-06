import browser from 'webextension-polyfill';
import Dexie from 'dexie';
import { emitter, TrackerFoundEvent } from '../before-request';
import { extractHostFromURL } from '../utils';
import { createAlarm } from '../wrapper';

const DAY_MS = 24 * 60 * 60 * 1000;
/** The feed covers today and the 7 days before it, in UTC. */
const DAYS = 7;
const PRUNE_ALARM_NAME = 'pruneNtpActivity';

/**
 * @typedef {object} DayTrackers - the trackers found on a domain's pages in a day
 * @property {string} domain
 * @property {number} day - days since the epoch, UTC
 * @property {number} count - how many were blocked
 * @property {string[]} companies - display names of the blocked trackers' owners
 *
 * @typedef {{ count: number, companies: string[] }} PendingTrackers
 *
 * @typedef {object} SiteActivity
 * @property {{ url: string, title: string, lastVisitTime: number }[]} pages - most recently visited first
 * @property {boolean} trackersFound
 * @property {number} trackersBlocked
 * @property {string[]} companies
 */

/**
 * The New Tab Page's activity feed: the browser's history for the last 7 days by
 * domain, with the trackers found on each domain, which are kept in IndexedDB.
 * Tracker data goes with the history: on a burn, when all history is deleted, and
 * once a domain is no longer in it.
 *
 * Fires 'change' with the affected domains as `detail`.
 */
export default class NTPActivity extends EventTarget {
    /**
     * Trackers found by domain, not yet written.
     * @type {Map<string, PendingTrackers>}
     */
    pendingTrackers = new Map();

    /** @type {ReturnType<typeof setTimeout>?} */
    flushTimer = null;

    /**
     * Must be constructed on the first tick of the service worker, so that its
     * history and burn listeners wake it.
     * @param {string} [dbName]
     */
    constructor(dbName = 'ntpActivity') {
        super();
        this.db = new Dexie(dbName);
        this.db.version(1).stores({ trackers: '[domain+day], domain, day' });
        /** @type {import('dexie').Table<DayTrackers, [string, number]>} */
        this.trackers = this.db.table('trackers');

        // At most one write a second while trackers are being found.
        emitter.on(TrackerFoundEvent.eventName, (event) => {
            if (!(event instanceof TrackerFoundEvent)) return;
            const domain = pageDomain(event.pageUrl);
            if (!domain) return;
            const pending = this.pendingTrackers.get(domain) || { count: 0, companies: [] };
            if (event.blocked) {
                pending.count++;
                pending.companies.push(event.companyDisplayName);
            }
            this.pendingTrackers.set(domain, pending);
            this.flushTimer ||= setTimeout(() => this.flushTrackers(), 1000);
        });

        browser.history.onVisited.addListener(({ url }) => {
            this.dispatchEvent(new CustomEvent('change', { detail: [pageDomain(url || '')] }));
        });
        browser.history.onVisitRemoved.addListener(({ allHistory, urls }) => {
            if (allHistory) {
                this.clear();
            } else {
                this.dispatchEvent(new CustomEvent('change', { detail: (urls || []).map(pageDomain) }));
            }
        });
        chrome.ddg?.onBurnStarted?.addListener(() => this.clear());

        createAlarm(PRUNE_ALARM_NAME, { periodInMinutes: 60 });
        browser.alarms.onAlarm.addListener(({ name }) => {
            if (name === PRUNE_ALARM_NAME) {
                this.trackers
                    .where('day')
                    .below(today() - DAYS)
                    .delete();
            }
        });
    }

    /**
     * The last 7 days of the browser's history by domain, both most recently
     * visited first. Forgets the trackers of domains no longer in it.
     * @returns {Promise<Map<string, SiteActivity>>}
     */
    async getSites() {
        const firstDay = today() - DAYS;
        const [historyItems, trackers] = await Promise.all([
            browser.history.search({ text: '', startTime: firstDay * DAY_MS, maxResults: 0 }),
            this.trackers.where('day').aboveOrEqual(firstDay).toArray(),
        ]);
        /** @type {Map<string, SiteActivity>} */
        const sites = new Map();
        for (const { url = '', title = '', lastVisitTime = 0 } of historyItems) {
            const domain = pageDomain(url);
            if (!domain) continue;
            const site = sites.get(domain) || { pages: [], trackersFound: false, trackersBlocked: 0, companies: [] };
            site.pages.push({ url, title, lastVisitTime });
            sites.set(domain, site);
        }
        /** @type {[string, number][]} */
        const forgotten = [];
        for (const { domain, day, count, companies } of trackers) {
            const site = sites.get(domain);
            if (site) {
                site.trackersFound = true;
                site.trackersBlocked += count;
                site.companies = [...new Set([...site.companies, ...companies])];
            } else {
                forgotten.push([domain, day]);
            }
        }
        await this.trackers.bulkDelete(forgotten);
        return sites;
    }

    async flushTrackers() {
        this.flushTimer = null;
        const day = today();
        const pending = [...this.pendingTrackers];
        this.pendingTrackers = new Map();
        await this.db.transaction('rw', this.trackers, async () => {
            const rows = await this.trackers.bulkGet(pending.map(([domain]) => [domain, day]));
            await this.trackers.bulkPut(
                pending.map(([domain, { count, companies }], i) => {
                    const row = rows[i] || { domain, day, count: 0, companies: [] };
                    row.count += count;
                    row.companies = [...new Set([...row.companies, ...companies])];
                    return row;
                }),
            );
        });
        this.dispatchEvent(new CustomEvent('change', { detail: pending.map(([domain]) => domain) }));
    }

    /**
     * Delete a domain's last 7 days from the browser's history and forget its
     * trackers.
     * @param {string} domain
     */
    async removeDomain(domain) {
        const site = (await this.getSites()).get(domain);
        await Promise.all((site?.pages || []).map(({ url }) => browser.history.deleteUrl({ url })));
        this.pendingTrackers.delete(domain);
        await this.trackers.where('domain').equals(domain).delete();
        this.dispatchEvent(new CustomEvent('change', { detail: [domain] }));
    }

    async clear() {
        this.pendingTrackers.clear();
        await this.trackers.clear();
        this.dispatchEvent(new CustomEvent('change', { detail: [] }));
    }
}

/**
 * The domain a page is grouped under: its host without any www., or '' for
 * anything but http(s).
 * @param {string} url
 * @returns {string}
 */
export function pageDomain(url) {
    return /^https?:/.test(url) ? extractHostFromURL(url) : '';
}

/**
 * @returns {number} days since the epoch, UTC
 */
function today() {
    return Math.floor(Date.now() / DAY_MS);
}

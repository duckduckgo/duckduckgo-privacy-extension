import browser from 'webextension-polyfill';
import Dexie from 'dexie';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { extractHostFromURL } from '../utils';
import { createAlarm } from '../wrapper';

const DAY_MS = 24 * 60 * 60 * 1000;
/** The feed covers today and the 7 days before it, in UTC. */
const DAYS = 7;
const PRUNE_ALARM_NAME = 'pruneNtpActivity';

/**
 * @typedef {object} BlockedTrackers - the trackers blocked on a domain's pages in a day
 * @property {string} domain
 * @property {number} day - days since the epoch, UTC
 * @property {number} count
 * @property {string[]} companies - display names of the trackers' owners
 *
 * @typedef {object} SiteActivity
 * @property {{ url: string, title: string, lastVisitTime: number }[]} pages - most recently visited first
 * @property {number} trackersBlocked
 * @property {string[]} companies
 */

/**
 * The New Tab Page's activity feed: the browser's history for the last 7 days by
 * domain, with the trackers blocked on each domain, which are kept in IndexedDB.
 * Tracker data goes with the history: on a burn, when all history is deleted, and
 * once a domain is no longer in it.
 *
 * Fires 'change' with the affected domains as `detail`.
 */
export default class NTPActivity extends EventTarget {
    /**
     * Blocked trackers' owners by domain, not yet written.
     * @type {Map<string, string[]>}
     */
    pendingBlocked = new Map();

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
        this.db.version(1).stores({ blocked: '[domain+day], domain, day' });
        /** @type {import('dexie').Table<BlockedTrackers, [string, number]>} */
        this.blocked = this.db.table('blocked');

        // At most one write a second while trackers are being blocked.
        emitter.on(TrackerBlockedEvent.eventName, (event) => {
            if (!(event instanceof TrackerBlockedEvent)) return;
            const domain = pageDomain(event.pageUrl || '');
            if (!domain) return;
            const companies = this.pendingBlocked.get(domain) || [];
            companies.push(event.companyDisplayName);
            this.pendingBlocked.set(domain, companies);
            if (this.flushTimer) return;
            this.flushTimer = setTimeout(() => this.flushBlocked(), 1000);
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
                this.blocked
                    .where('day')
                    .below(today() - DAYS)
                    .delete();
            }
        });
    }

    /**
     * The last 7 days of the browser's history by domain, both most recently
     * visited first. Forgets the blocked trackers of domains no longer in it.
     * @returns {Promise<Map<string, SiteActivity>>}
     */
    async getSites() {
        const firstDay = today() - DAYS;
        const [historyItems, blocked] = await Promise.all([
            browser.history.search({ text: '', startTime: firstDay * DAY_MS, maxResults: 0 }),
            this.blocked.where('day').aboveOrEqual(firstDay).toArray(),
        ]);
        /** @type {Map<string, SiteActivity>} */
        const sites = new Map();
        for (const { url = '', title = '', lastVisitTime = 0 } of historyItems) {
            const domain = pageDomain(url);
            if (!domain) continue;
            const site = sites.get(domain) || { pages: [], trackersBlocked: 0, companies: [] };
            site.pages.push({ url, title, lastVisitTime });
            sites.set(domain, site);
        }
        /** @type {[string, number][]} */
        const forgotten = [];
        for (const { domain, day, count, companies } of blocked) {
            const site = sites.get(domain);
            if (site) {
                site.trackersBlocked += count;
                site.companies = [...new Set([...site.companies, ...companies])];
            } else {
                forgotten.push([domain, day]);
            }
        }
        await this.blocked.bulkDelete(forgotten);
        return sites;
    }

    async flushBlocked() {
        this.flushTimer = null;
        const day = today();
        const pending = [...this.pendingBlocked];
        this.pendingBlocked = new Map();
        await this.db.transaction('rw', this.blocked, async () => {
            const rows = await this.blocked.bulkGet(pending.map(([domain]) => [domain, day]));
            await this.blocked.bulkPut(
                pending.map(([domain, companies], i) => {
                    const row = rows[i] || { domain, day, count: 0, companies: [] };
                    row.count += companies.length;
                    row.companies = [...new Set([...row.companies, ...companies])];
                    return row;
                }),
            );
        });
        this.dispatchEvent(new CustomEvent('change', { detail: pending.map(([domain]) => domain) }));
    }

    /**
     * Delete a domain's last 7 days from the browser's history and forget its
     * blocked trackers.
     * @param {string} domain
     */
    async removeDomain(domain) {
        const site = (await this.getSites()).get(domain);
        await Promise.all((site?.pages || []).map(({ url }) => browser.history.deleteUrl({ url })));
        this.pendingBlocked.delete(domain);
        await this.blocked.where('domain').equals(domain).delete();
        this.dispatchEvent(new CustomEvent('change', { detail: [domain] }));
    }

    async clear() {
        this.pendingBlocked.clear();
        await this.blocked.clear();
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

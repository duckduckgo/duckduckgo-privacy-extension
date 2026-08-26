import Dexie from 'dexie';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Activity is only kept for the last 7 days, matching the NTP's "Past 7 days" framing. */
export const RETENTION_MS = 7 * DAY_MS;
/** Maximum number of sites kept (the least recently visited are dropped first). */
export const MAX_SITES = 100;
/** Maximum number of history entries kept per site. */
export const MAX_HISTORY_ENTRIES = 10;

/**
 * @typedef {object} SiteActivityRow
 * @property {string} host - full hostname the activity is grouped by (primary key)
 * @property {string} url - canonical URL for the site (used for favicon + title link)
 * @property {string} etldPlusOne - eTLD+1 of the host, used by the NTP for fallback colors
 * @property {number} lastVisit - timestamp of the most recent visit
 * @property {number} totalCount - number of tracking attempts blocked on this site
 * @property {Record<string, number>} companies - blocked count per company displayName
 * @property {{ title: string, url: string, visitedAt: number }[]} history - recent page
 *   visits, most recent first, capped at MAX_HISTORY_ENTRIES
 */

/**
 * IndexedDB-backed store of per-site browsing activity used by the embedded
 * New Tab Page's activity ("Details") feed. Sites are grouped by full
 * hostname. All data is local-only, pruned to the last 7 days, and removable
 * per-site via the NTP.
 *
 * IndexedDB is the source of truth: there is no in-memory state to restore,
 * so MV3 service worker restarts need no special handling.
 */
export class NTPActivityStore {
    /**
     * @param {string} [dbName] - overridable for tests
     */
    constructor(dbName = 'ntpActivity') {
        this.db = new Dexie(dbName);
        this.db.version(1).stores({
            // '&host' = primary key; lastVisit is indexed for ordering and pruning
            sites: '&host, lastVisit',
        });
        /** @type {import('dexie').Table<SiteActivityRow, string>} */
        this.sites = this.db.table('sites');
    }

    /**
     * @param {string} host
     * @param {string} etldPlusOne
     * @returns {SiteActivityRow}
     */
    static emptyRow(host, etldPlusOne) {
        return {
            host,
            url: `https://${host}/`,
            etldPlusOne,
            lastVisit: 0,
            totalCount: 0,
            companies: {},
            history: [],
        };
    }

    /**
     * Record a page visit (main-frame navigation).
     * @param {object} visit
     * @param {string} visit.host
     * @param {string} visit.etldPlusOne
     * @param {string} visit.url - full page URL
     * @param {string} [visit.title] - page title, if known yet (see updateTitle)
     * @param {number} [visit.timestamp]
     */
    async recordVisit({ host, etldPlusOne, url, title, timestamp = Date.now() }) {
        await this.db.transaction('rw', this.sites, async () => {
            const row = (await this.sites.get(host)) || NTPActivityStore.emptyRow(host, etldPlusOne);
            row.lastVisit = Math.max(row.lastVisit, timestamp);
            if (row.history[0]?.url === url) {
                // repeat visit to the same page: refresh the existing entry
                row.history[0].visitedAt = timestamp;
                if (title) {
                    row.history[0].title = title;
                }
            } else {
                row.history.unshift({ title: title || url, url, visitedAt: timestamp });
                row.history = row.history.slice(0, MAX_HISTORY_ENTRIES);
            }
            await this.sites.put(row);
        });
    }

    /**
     * Set the title of a previously recorded page visit (titles typically
     * arrive after the navigation is committed).
     * @param {string} host
     * @param {string} url
     * @param {string} title
     * @returns {Promise<boolean>} whether an entry was updated
     */
    async updateTitle(host, url, title) {
        return await this.db.transaction('rw', this.sites, async () => {
            const row = await this.sites.get(host);
            const entry = row?.history.find((h) => h.url === url);
            if (!row || !entry || entry.title === title) {
                return false;
            }
            entry.title = title;
            await this.sites.put(row);
            return true;
        });
    }

    /**
     * Add blocked tracker counts for a site.
     * @param {object} site
     * @param {string} site.host
     * @param {string} site.etldPlusOne
     * @param {Record<string, number>} companyCounts - blocked count per company displayName
     * @param {number} [timestamp]
     */
    async recordBlockedTrackers({ host, etldPlusOne }, companyCounts, timestamp = Date.now()) {
        await this.db.transaction('rw', this.sites, async () => {
            // The row is normally created by recordVisit first; creating it
            // here covers blocked requests racing the navigation bookkeeping.
            const row = (await this.sites.get(host)) || NTPActivityStore.emptyRow(host, etldPlusOne);
            row.lastVisit = Math.max(row.lastVisit, timestamp);
            for (const [displayName, count] of Object.entries(companyCounts)) {
                row.companies[displayName] = (row.companies[displayName] || 0) + count;
                row.totalCount += count;
            }
            await this.sites.put(row);
        });
    }

    /**
     * All rows, most recently visited first.
     * @param {number} [limit]
     * @returns {Promise<SiteActivityRow[]>}
     */
    async getAll(limit = MAX_SITES) {
        return await this.sites.orderBy('lastVisit').reverse().limit(limit).toArray();
    }

    /**
     * @param {string} host
     * @returns {Promise<SiteActivityRow|undefined>}
     */
    async get(host) {
        return await this.sites.get(host);
    }

    /**
     * Rows for the given site URLs (as returned by getAll), in the given order.
     * @param {string[]} urls
     * @returns {Promise<SiteActivityRow[]>}
     */
    async getForUrls(urls) {
        const hosts = urls.map((url) => hostForUrl(url)).filter((host) => host !== null);
        const rows = await this.sites.bulkGet(/** @type {string[]} */ (hosts));
        return rows.filter((row) => !!row);
    }

    /**
     * Total number of blocked tracking attempts across all (7-day retained) rows.
     * @returns {Promise<number>}
     */
    async getTotalTrackersBlocked() {
        const rows = await this.sites.toArray();
        return rows.reduce((total, row) => total + row.totalCount, 0);
    }

    /**
     * Remove a site's activity, by its site URL.
     * @param {string} url
     * @returns {Promise<boolean>} whether a row was removed
     */
    async removeByUrl(url) {
        const host = hostForUrl(url);
        if (!host) return false;
        const existed = !!(await this.sites.get(host));
        await this.sites.delete(host);
        return existed;
    }

    /**
     * Drop rows older than the retention window, and enforce the row cap.
     * @param {number} [now]
     */
    async prune(now = Date.now()) {
        await this.db.transaction('rw', this.sites, async () => {
            await this.sites
                .where('lastVisit')
                .below(now - RETENTION_MS)
                .delete();
            const excess = (await this.sites.count()) - MAX_SITES;
            if (excess > 0) {
                const oldest = await this.sites.orderBy('lastVisit').limit(excess).primaryKeys();
                await this.sites.bulkDelete(oldest);
            }
        });
    }
}

/**
 * @param {string} url
 * @returns {string|null}
 */
function hostForUrl(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (e) {
        return null;
    }
}

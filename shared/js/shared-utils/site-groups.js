import { normalizeBlockedSite } from './blocked-sites';

export const RESET_HOUR = 6;
/** Focus days kept on disk, including today. The analytics view shows a shorter window. */
export const USAGE_HISTORY_DAYS = 90;
export const TIME_ANALYTICS_RANGE_DAYS = 7;
export const DEFAULT_GROUP_ID = 'default';
export const ALWAYS_BLOCK_GROUP_ID = 'always-block';
export const ALWAYS_BLOCK_GROUP_NAME = 'Always Block';
export const DEFAULT_GROUP_MAX_SECONDS = 50 * 60;
export const MAX_GROUP_SECONDS_PER_DAY = 24 * 60 * 60;
export const MAX_GROUP_NAME_LENGTH = 60;

export const ALARM_DAILY_RESET = 'site-groups-daily-reset';
export const ALARM_EXPIRY = 'site-groups-expiry';
export const ALARM_CHECKPOINT = 'site-groups-checkpoint';

/**
 * @typedef {object} SiteGroup
 * @property {string} id
 * @property {string} name
 * @property {number} maxSecondsPerDay
 * @property {string[]} domains
 */

/**
 * @typedef {object} DayUsage
 * @property {number} usedSeconds
 * @property {Record<string, number>} [domains]
 */

/**
 * @typedef {object} GroupUsageEntry
 * @property {string} periodKey
 * @property {number} usedSeconds
 * @property {number} [lastTickAt]
 * @property {Record<string, number>} [domains] Seconds used today on each group site
 * @property {Record<string, DayUsage>} [history] Earlier focus days, keyed by periodKey
 */

/**
 * @param {string[]} [legacyDomains]
 * @returns {SiteGroup[]}
 */
export function createDefaultGroups(legacyDomains = []) {
    /** @type {string[]} */
    const domains = [];
    for (const value of legacyDomains) {
        const domain = normalizeBlockedSite(value);
        if (domain) {
            domains.push(domain);
        }
    }
    return [
        {
            id: DEFAULT_GROUP_ID,
            name: 'Default',
            maxSecondsPerDay: DEFAULT_GROUP_MAX_SECONDS,
            domains: [],
        },
        {
            id: ALWAYS_BLOCK_GROUP_ID,
            name: ALWAYS_BLOCK_GROUP_NAME,
            maxSecondsPerDay: 0,
            domains: Array.from(new Set(domains)).sort(),
        },
    ];
}

/**
 * Focus-day key that starts at 6:00 local time, not midnight.
 *
 * @param {number | Date} [now]
 * @returns {string}
 */
export function getPeriodKey(now = Date.now()) {
    const date = new Date(now);
    if (date.getHours() < RESET_HOUR) {
        date.setDate(date.getDate() - 1);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * @param {number | Date} [now]
 * @returns {number}
 */
export function getNextResetTime(now = Date.now()) {
    const date = new Date(now);
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), RESET_HOUR, 0, 0, 0);
    if (date.getTime() >= next.getTime()) {
        next.setDate(next.getDate() + 1);
    }
    return next.getTime();
}

/**
 * @param {unknown} group
 * @returns {SiteGroup | null}
 */
export function normalizeGroup(group) {
    if (!group || typeof group !== 'object') {
        return null;
    }

    const raw = /** @type {Record<string, unknown>} */ (group);
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id) {
        return null;
    }

    const maxSecondsPerDay = Math.max(0, Math.min(MAX_GROUP_SECONDS_PER_DAY, Math.floor(Number(raw.maxSecondsPerDay) || 0)));
    /** @type {string[]} */
    const domains = [];
    if (Array.isArray(raw.domains)) {
        for (const value of raw.domains) {
            const domain = normalizeBlockedSite(value);
            if (domain) {
                domains.push(domain);
            }
        }
    }
    const uniqueDomains = Array.from(new Set(domains)).sort();

    if (id === ALWAYS_BLOCK_GROUP_ID) {
        return {
            id,
            name: ALWAYS_BLOCK_GROUP_NAME,
            maxSecondsPerDay: 0,
            domains: uniqueDomains,
        };
    }

    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_GROUP_NAME_LENGTH) : '';
    if (!name) {
        return null;
    }

    return { id, name, maxSecondsPerDay, domains: uniqueDomains };
}

/**
 * @param {string | { id?: string } | null | undefined} groupOrId
 * @returns {boolean}
 */
export function isAlwaysBlockGroup(groupOrId) {
    const id = typeof groupOrId === 'string' ? groupOrId : groupOrId?.id;
    return id === ALWAYS_BLOCK_GROUP_ID;
}

/**
 * Keep Always Block present after install and upgrades.
 *
 * @param {SiteGroup[]} groups
 * @param {string[]} [legacyDomains]
 * @returns {SiteGroup[]}
 */
export function ensureAlwaysBlockGroup(groups, legacyDomains = []) {
    const normalized = normalizeGroups(groups);
    if (normalized.some(isAlwaysBlockGroup)) {
        return normalized;
    }
    const always = normalizeGroup({
        id: ALWAYS_BLOCK_GROUP_ID,
        name: ALWAYS_BLOCK_GROUP_NAME,
        maxSecondsPerDay: 0,
        domains: legacyDomains,
    });
    return always ? [...normalized, always] : normalized;
}

/**
 * @param {unknown} groups
 * @returns {SiteGroup[]}
 */
export function normalizeGroups(groups) {
    if (!Array.isArray(groups)) {
        return [];
    }
    /** @type {SiteGroup[]} */
    const normalized = [];
    for (const group of groups) {
        const next = normalizeGroup(group);
        if (next) {
            normalized.push(next);
        }
    }
    return normalized;
}

/**
 * @param {string} hostname
 * @param {string} domain
 * @returns {boolean}
 */
export function hostnameMatchesDomain(hostname, domain) {
    if (!hostname || !domain) {
        return false;
    }
    const host = hostname.toLowerCase().replace(/\.$/, '');
    const value = domain.toLowerCase().replace(/\.$/, '');
    return host === value || host.endsWith(`.${value}`);
}

/**
 * Prefer the longest matching domain so `www.youtube.com` wins over `youtube.com`.
 *
 * @param {SiteGroup[]} groups
 * @param {string | null | undefined} hostname
 * @returns {SiteGroup | null}
 */
export function findGroupForHostname(groups, hostname) {
    if (!hostname) {
        return null;
    }

    let bestGroup = null;
    let bestLength = -1;
    for (const group of groups) {
        for (const domain of group.domains) {
            if (hostnameMatchesDomain(hostname, domain) && domain.length > bestLength) {
                bestGroup = group;
                bestLength = domain.length;
            }
        }
    }
    return bestGroup;
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function hostnameFromUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.hostname.toLowerCase().replace(/\.$/, '') || null;
    } catch {
        return null;
    }
}

/**
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {number}
 */
export function getUsedSeconds(group, usage, now = Date.now()) {
    const current = usage?.[group.id];
    if (!current || current.periodKey !== getPeriodKey(now)) {
        return 0;
    }
    const used = Number(current.usedSeconds);
    return Number.isFinite(used) && used > 0 ? used : 0;
}

/**
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {number}
 */
export function getRemainingSeconds(group, usage, now = Date.now()) {
    if (!group || group.maxSecondsPerDay <= 0) {
        return 0;
    }
    return Math.max(0, group.maxSecondsPerDay - getUsedSeconds(group, usage, now));
}

/**
 * Timed groups that have used today's budget cannot be edited until 6:00.
 * Always-block groups (0 hr / 0 min) stay editable.
 *
 * @param {SiteGroup | null | undefined} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {boolean}
 */
export function isGroupSettingsLocked(group, usage, now = Date.now()) {
    if (!group || group.maxSecondsPerDay <= 0) {
        return false;
    }
    return getRemainingSeconds(group, usage, now) <= 0;
}

/**
 * @param {SiteGroup[]} groups
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {string[]}
 */
export function getCurrentlyBlockedDomains(groups, usage, now = Date.now()) {
    const domains = new Set();
    for (const group of groups) {
        if (getRemainingSeconds(group, usage, now) <= 0) {
            for (const domain of group.domains) {
                domains.add(domain);
            }
        }
    }
    return Array.from(domains).sort();
}

/**
 * Longest group domain that matches the hostname, so `music.youtube.com` wins over `youtube.com`.
 *
 * @param {SiteGroup | null | undefined} group
 * @param {string | null | undefined} hostname
 * @returns {string | null}
 */
export function matchingGroupDomain(group, hostname) {
    if (!group || !hostname) {
        return null;
    }

    let bestDomain = null;
    let bestLength = -1;
    for (const domain of group.domains || []) {
        if (hostnameMatchesDomain(hostname, domain) && domain.length > bestLength) {
            bestDomain = domain;
            bestLength = domain.length;
        }
    }
    return bestDomain;
}

/**
 * @param {string} periodKey
 * @param {number} days
 * @returns {string}
 */
export function shiftPeriodKey(periodKey, days) {
    const [year, month, day] = periodKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    const nextDay = String(date.getDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * Focus-day keys from oldest to newest, including today. `dayCount` 7 is today and the six days before it.
 *
 * @param {number | Date} [now]
 * @param {number} [dayCount]
 * @returns {string[]}
 */
export function recentPeriodKeys(now = Date.now(), dayCount = TIME_ANALYTICS_RANGE_DAYS) {
    const today = getPeriodKey(now);
    const count = Math.max(1, Math.floor(dayCount) || 1);
    /** @type {string[]} */
    const keys = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
        keys.push(shiftPeriodKey(today, -offset));
    }
    return keys;
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isPeriodKey(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * @param {unknown} domains
 * @returns {Record<string, number>}
 */
function normalizeDomainSeconds(domains) {
    if (!domains || typeof domains !== 'object') {
        return {};
    }
    /** @type {Record<string, number>} */
    const normalized = {};
    for (const [domain, seconds] of Object.entries(domains)) {
        const used = Number(seconds);
        if (!domain || !Number.isFinite(used) || used <= 0) {
            continue;
        }
        normalized[domain] = used;
    }
    return normalized;
}

/**
 * Move a finished focus day into history and drop days outside the retention window.
 * Today's counters stay out of history.
 *
 * @param {Partial<GroupUsageEntry> | null | undefined} entry
 * @param {string} periodKey
 * @param {number} [retainDays]
 * @returns {Record<string, DayUsage>}
 */
export function archiveUsageEntry(entry, periodKey, retainDays = USAGE_HISTORY_DAYS) {
    /** @type {Record<string, DayUsage>} */
    const history = {};
    const rawHistory = entry?.history;
    if (rawHistory && typeof rawHistory === 'object') {
        for (const [key, day] of Object.entries(rawHistory)) {
            if (!isPeriodKey(key) || !day || typeof day !== 'object') {
                continue;
            }
            const usedSeconds = Number(day.usedSeconds);
            if (!Number.isFinite(usedSeconds) || usedSeconds <= 0) {
                continue;
            }
            history[key] = {
                usedSeconds,
                domains: normalizeDomainSeconds(day.domains),
            };
        }
    }

    if (entry && isPeriodKey(entry.periodKey) && entry.periodKey !== periodKey) {
        const usedSeconds = Number(entry.usedSeconds);
        if (Number.isFinite(usedSeconds) && usedSeconds > 0) {
            history[entry.periodKey] = {
                usedSeconds,
                domains: normalizeDomainSeconds(entry.domains),
            };
        }
    }

    const keepFrom = shiftPeriodKey(periodKey, -(Math.max(1, retainDays) - 1));
    for (const key of Object.keys(history)) {
        if (key < keepFrom || key >= periodKey) {
            delete history[key];
        }
    }
    return history;
}

/**
 * Archive finished days for every group and start empty counters when the focus day has changed.
 *
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {Record<string, GroupUsageEntry>}
 */
export function rollUsageToPeriod(usage, now = Date.now()) {
    const periodKey = getPeriodKey(now);
    /** @type {Record<string, GroupUsageEntry>} */
    const next = {};
    for (const [groupId, entry] of Object.entries(usage || {})) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const history = archiveUsageEntry(entry, periodKey);
        const samePeriod = entry.periodKey === periodKey;
        const usedSeconds = samePeriod ? Math.max(0, Number(entry.usedSeconds) || 0) : 0;
        const domains = samePeriod ? normalizeDomainSeconds(entry.domains) : {};
        if (usedSeconds <= 0 && Object.keys(domains).length === 0 && Object.keys(history).length === 0) {
            continue;
        }
        next[groupId] = {
            periodKey,
            usedSeconds,
            domains,
            history,
        };
    }
    return next;
}

/**
 * Add elapsed time to one uncapped usage record, such as Allowed Sites.
 * A finished focus day is archived the same way as a site group.
 *
 * @param {Partial<GroupUsageEntry> | null | undefined} entry
 * @param {number} elapsedSeconds
 * @param {number | Date} [now]
 * @param {string | null | undefined} [pattern]
 * @returns {GroupUsageEntry}
 */
export function applyAllowedElapsed(entry, elapsedSeconds, now = Date.now(), pattern = null) {
    const periodKey = getPeriodKey(now);
    const elapsed = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 0;
    const samePeriod = entry != null && entry.periodKey === periodKey;
    const used = samePeriod ? Math.max(0, Number(entry.usedSeconds) || 0) : 0;
    const domains = samePeriod ? normalizeDomainSeconds(entry.domains) : {};
    if (pattern && elapsed > 0) {
        domains[pattern] = (domains[pattern] || 0) + elapsed;
    }

    return {
        periodKey,
        usedSeconds: used + elapsed,
        domains,
        history: archiveUsageEntry(entry, periodKey),
    };
}

/**
 * @param {Partial<GroupUsageEntry> | null | undefined} entry
 * @param {number | Date} [now]
 * @returns {GroupUsageEntry | null}
 */
export function rollAllowedSiteUsage(entry, now = Date.now()) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const rolled = rollUsageToPeriod({ allowed: /** @type {GroupUsageEntry} */ (entry) }, now);
    return rolled.allowed || null;
}

/**
 * @param {{ id: string }} group
 * @param {Record<string, Partial<GroupUsageEntry> | undefined>} usage
 * @param {number | Date} [now]
 * @param {number} [dayCount]
 * @returns {{ periodKey: string, usedSeconds: number, domains: Record<string, number>, isToday: boolean }[]}
 */
export function getUsageDays(group, usage, now = Date.now(), dayCount = TIME_ANALYTICS_RANGE_DAYS) {
    const entry = usage?.[group?.id];
    const today = getPeriodKey(now);
    return recentPeriodKeys(now, dayCount).map((periodKey) => {
        if (periodKey === today && entry?.periodKey === today) {
            return {
                periodKey,
                usedSeconds: Math.max(0, Number(entry.usedSeconds) || 0),
                domains: normalizeDomainSeconds(entry.domains),
                isToday: true,
            };
        }
        const day = entry?.history?.[periodKey];
        return {
            periodKey,
            usedSeconds: Math.max(0, Number(day?.usedSeconds) || 0),
            domains: normalizeDomainSeconds(day?.domains),
            isToday: periodKey === today,
        };
    });
}

/**
 * Today's per-site seconds. Entries from an earlier focus day are ignored.
 *
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {Record<string, number>}
 */
export function getDomainUsage(group, usage, now = Date.now()) {
    const current = usage?.[group?.id];
    if (!current || current.periodKey !== getPeriodKey(now) || !current.domains || typeof current.domains !== 'object') {
        return {};
    }

    /** @type {Record<string, number>} */
    const domains = {};
    for (const [domain, seconds] of Object.entries(current.domains)) {
        const used = Number(seconds);
        if (!domain || !Number.isFinite(used) || used <= 0) {
            continue;
        }
        domains[domain] = used;
    }
    return domains;
}

/**
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number} elapsedSeconds
 * @param {number | Date} [now]
 * @param {string | null | undefined} [hostname] Site that was open while this time elapsed
 * @returns {{ usage: Record<string, GroupUsageEntry>, expired: boolean, remainingSeconds: number }}
 */
export function applyElapsed(group, usage, elapsedSeconds, now = Date.now(), hostname = null) {
    const nextUsage = /** @type {Record<string, GroupUsageEntry>} */ ({ ...(usage || {}) });
    if (!group || group.maxSecondsPerDay <= 0) {
        return {
            usage: nextUsage,
            expired: true,
            remainingSeconds: 0,
        };
    }

    const elapsed = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 0;
    const periodKey = getPeriodKey(now);
    const used = getUsedSeconds(group, nextUsage, now);
    const nextUsed = Math.min(group.maxSecondsPerDay, used + elapsed);
    const credited = Math.max(0, nextUsed - used);
    const previous = nextUsage[group.id];
    const history = archiveUsageEntry(previous, periodKey);
    const domains = previous && previous.periodKey === periodKey ? { ...getDomainUsage(group, nextUsage, now) } : {};
    const domain = matchingGroupDomain(group, hostname);
    if (domain && credited > 0) {
        domains[domain] = (domains[domain] || 0) + credited;
    }

    nextUsage[group.id] = {
        periodKey,
        usedSeconds: nextUsed,
        domains,
        history,
    };

    return {
        usage: nextUsage,
        expired: nextUsed >= group.maxSecondsPerDay,
        remainingSeconds: Math.max(0, group.maxSecondsPerDay - nextUsed),
    };
}

/**
 * @param {SiteGroup[]} groups
 * @param {string} groupId
 * @param {string} domain
 * @returns {SiteGroup[]}
 */
export function addDomainToGroup(groups, groupId, domain) {
    const normalized = normalizeBlockedSite(domain);
    if (!normalized) {
        return groups;
    }

    return groups.map((group) => {
        if (group.id === groupId) {
            if (group.domains.includes(normalized)) {
                return group;
            }
            return { ...group, domains: [...group.domains, normalized].sort() };
        }
        if (!group.domains.includes(normalized)) {
            return group;
        }
        return { ...group, domains: group.domains.filter((value) => value !== normalized) };
    });
}

/**
 * @param {SiteGroup[]} groups
 * @param {string} groupId
 * @param {string} domain
 * @returns {SiteGroup[]}
 */
export function removeDomainFromGroup(groups, groupId, domain) {
    return groups.map((group) => {
        if (group.id !== groupId) {
            return group;
        }
        return { ...group, domains: group.domains.filter((value) => value !== domain) };
    });
}

/**
 * @param {unknown} seconds
 * @returns {{ hours: number, minutes: number }}
 */
export function secondsToHoursMinutes(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return {
        hours: Math.floor(total / 3600),
        minutes: Math.floor((total % 3600) / 60),
    };
}

/**
 * @param {unknown} hours
 * @param {unknown} minutes
 * @returns {number}
 */
export function hoursMinutesToSeconds(hours, minutes) {
    const h = Math.max(0, Math.floor(Number(hours) || 0));
    const m = Math.max(0, Math.floor(Number(minutes) || 0));
    return Math.min(MAX_GROUP_SECONDS_PER_DAY, h * 3600 + m * 60);
}

/**
 * Compact countdown used in the popup, e.g. `59:37` or `1:05:00`.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatRemaining(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value) => String(value).padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${minutes}:${pad(secs)}`;
}

/**
 * Options-page countdown, always `h:mm:ss`.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatRemainingLong(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value) => String(value).padStart(2, '0');
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * @param {number} maxSecondsPerDay
 * @returns {string}
 */
export function formatAllowance(maxSecondsPerDay) {
    if (maxSecondsPerDay <= 0) {
        return 'Always blocked';
    }
    const { hours, minutes } = secondsToHoursMinutes(maxSecondsPerDay);
    if (hours && minutes) {
        return `${hours} hr ${minutes} min allowed daily`;
    }
    if (hours) {
        return hours === 1 ? '1 hour allowed daily' : `${hours} hr allowed daily`;
    }
    return minutes === 1 ? '1 min allowed daily' : `${minutes} min allowed daily`;
}

/**
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number | Date} [now]
 * @returns {number}
 */
export function remainingProgressPercent(group, usage, now = Date.now()) {
    if (!group || group.maxSecondsPerDay <= 0) {
        return 0;
    }
    return (getRemainingSeconds(group, usage, now) / group.maxSecondsPerDay) * 100;
}

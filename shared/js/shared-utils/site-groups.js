import { normalizeBlockedSite } from './blocked-sites';

export const RESET_HOUR = 6;
export const DEFAULT_GROUP_ID = 'default';
export const ALWAYS_BLOCK_GROUP_ID = 'always-block';
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
 * @typedef {object} GroupUsageEntry
 * @property {string} periodKey
 * @property {number} usedSeconds
 * @property {number} [lastTickAt]
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
            name: 'Always Block',
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
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_GROUP_NAME_LENGTH) : '';
    if (!id || !name) {
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

    return { id, name, maxSecondsPerDay, domains: Array.from(new Set(domains)).sort() };
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
 * @param {SiteGroup} group
 * @param {Record<string, GroupUsageEntry | undefined>} usage
 * @param {number} elapsedSeconds
 * @param {number | Date} [now]
 * @returns {{ usage: Record<string, GroupUsageEntry>, expired: boolean, remainingSeconds: number }}
 */
export function applyElapsed(group, usage, elapsedSeconds, now = Date.now()) {
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
    const used = getUsedSeconds(group, nextUsage, now) + elapsed;
    const nextUsed = Math.min(group.maxSecondsPerDay, used);
    nextUsage[group.id] = {
        periodKey,
        usedSeconds: nextUsed,
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

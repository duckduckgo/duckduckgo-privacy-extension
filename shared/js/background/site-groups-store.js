import settings from './settings';
import { normalizeBlockedSite } from '../shared-utils/blocked-sites';
import { createDefaultGroups, ensureAlwaysBlockGroup, isAlwaysBlockGroup, normalizeGroup, normalizeGroups } from '../shared-utils/site-groups';

function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function legacyBlockedDomains() {
    const blockedSites = settings.getSetting('blockedSites') || {};
    const values = Array.isArray(blockedSites)
        ? blockedSites
        : Object.entries(blockedSites)
              .filter(([, enabled]) => enabled)
              .map(([domain]) => domain);
    /** @type {string[]} */
    const domains = [];
    for (const value of values) {
        const domain = normalizeBlockedSite(value);
        if (domain) {
            domains.push(domain);
        }
    }
    return Array.from(new Set(domains)).sort();
}

/**
 * Create Default + Always Block on first run, restore Always Block if it is
 * missing, and move any pre-groups `blockedSites` entries into Always Block.
 *
 * @returns {Promise<import('../shared-utils/site-groups').SiteGroup[]>}
 */
export async function ensureSiteGroups() {
    await settings.ready();
    const groups = getSiteGroups();
    const initialized = Boolean(settings.getSetting('siteGroupsInitialized'));
    const nextGroups = initialized
        ? ensureAlwaysBlockGroup(groups, legacyBlockedDomains())
        : createDefaultGroups(legacyBlockedDomains());

    const changed = !initialized || JSON.stringify(groups) !== JSON.stringify(nextGroups);
    if (changed) {
        settings.updateSetting('siteGroups', nextGroups);
        settings.updateSetting('groupUsage', settings.getSetting('groupUsage') || {});
        settings.updateSetting('siteGroupsInitialized', true);
    }
    return getSiteGroups();
}

/**
 * @returns {import('../shared-utils/site-groups').SiteGroup[]}
 */
export function getSiteGroups() {
    return normalizeGroups(clone(settings.getSetting('siteGroups')));
}

/**
 * @param {import('../shared-utils/site-groups').SiteGroup[]} groups
 * @returns {import('../shared-utils/site-groups').SiteGroup[]}
 */
export function saveSiteGroups(groups) {
    const normalized = normalizeGroups(groups);
    settings.updateSetting('siteGroups', normalized);
    return normalized;
}

/**
 * @returns {Record<string, import('../shared-utils/site-groups').GroupUsageEntry>}
 */
export function getGroupUsage() {
    const usage = settings.getSetting('groupUsage');
    return usage && typeof usage === 'object' ? clone(usage) : {};
}

/**
 * @param {Record<string, import('../shared-utils/site-groups').GroupUsageEntry>} usage
 */
export function saveGroupUsage(usage) {
    settings.updateSetting('groupUsage', usage && typeof usage === 'object' ? usage : {});
}

/**
 * @param {Partial<import('../shared-utils/site-groups').SiteGroup>} attrs
 * @returns {import('../shared-utils/site-groups').SiteGroup | null}
 */
export function createSiteGroup(attrs = {}) {
    const group = normalizeGroup({
        id: attrs.id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `group-${Date.now()}`),
        name: attrs.name || 'New group',
        maxSecondsPerDay: attrs.maxSecondsPerDay ?? 50 * 60,
        domains: attrs.domains || [],
    });
    if (!group) {
        return null;
    }
    const groups = getSiteGroups();
    groups.unshift(group);
    saveSiteGroups(groups);
    return group;
}

/**
 * @param {string} groupId
 * @param {{ name?: string, maxSecondsPerDay?: number }} updates
 * @returns {import('../shared-utils/site-groups').SiteGroup | null}
 */
export function updateSiteGroup(groupId, updates) {
    const groups = getSiteGroups();
    const index = groups.findIndex((group) => group.id === groupId);
    if (index === -1 || isAlwaysBlockGroup(groupId)) {
        return null;
    }
    const next = normalizeGroup({
        ...groups[index],
        ...updates,
        id: groupId,
        domains: groups[index].domains,
    });
    if (!next) {
        return null;
    }
    groups[index] = next;
    saveSiteGroups(groups);
    return next;
}

/**
 * @param {string} groupId
 * @returns {boolean}
 */
export function deleteSiteGroup(groupId) {
    if (isAlwaysBlockGroup(groupId)) {
        return false;
    }
    const groups = getSiteGroups();
    const next = groups.filter((group) => group.id !== groupId);
    if (next.length === groups.length) {
        return false;
    }
    saveSiteGroups(next);
    const usage = getGroupUsage();
    if (usage[groupId]) {
        delete usage[groupId];
        saveGroupUsage(usage);
    }
    return true;
}

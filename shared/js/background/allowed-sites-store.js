import settings from './settings';
import { normalizeAllowedPattern, normalizeAllowedSites } from '../shared-utils/allowed-sites';

function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @returns {string[]}
 */
export function getAllowedSites() {
    return normalizeAllowedSites(clone(settings.getSetting('allowedSites')));
}

/**
 * @returns {Partial<import('../shared-utils/site-groups').GroupUsageEntry>}
 */
export function getAllowedSiteUsage() {
    const usage = settings.getSetting('allowedSiteUsage');
    return usage && typeof usage === 'object' && !Array.isArray(usage) ? clone(usage) : {};
}

/**
 * @param {Partial<import('../shared-utils/site-groups').GroupUsageEntry> | null | undefined} usage
 */
export function saveAllowedSiteUsage(usage) {
    settings.updateSetting('allowedSiteUsage', usage && typeof usage === 'object' && !Array.isArray(usage) ? usage : {});
}

/**
 * @param {string[]} patterns
 * @returns {string[]}
 */
export function saveAllowedSites(patterns) {
    const normalized = normalizeAllowedSites(patterns);
    settings.updateSetting('allowedSites', normalized);
    return normalized;
}

/**
 * @param {string[]} patterns
 * @returns {string[]}
 */
export function addAllowedSitePatterns(patterns) {
    const next = new Set(getAllowedSites());
    for (const pattern of normalizeAllowedSites(patterns)) {
        next.add(pattern);
    }
    return saveAllowedSites(Array.from(next));
}

/**
 * @param {string} pattern
 * @returns {string[]}
 */
export function removeAllowedSitePattern(pattern) {
    const normalized = normalizeAllowedPattern(pattern).pattern || pattern;
    return saveAllowedSites(getAllowedSites().filter((entry) => entry !== normalized));
}

/**
 * @param {string[]} patterns
 * @returns {string[]}
 */
export function removeAllowedSitePatterns(patterns) {
    const toRemove = new Set(normalizeAllowedSites(patterns));
    for (const value of patterns) {
        const normalized = normalizeAllowedPattern(value).pattern;
        if (normalized) {
            toRemove.add(normalized);
        } else if (typeof value === 'string') {
            toRemove.add(value);
        }
    }
    return saveAllowedSites(getAllowedSites().filter((entry) => !toRemove.has(entry)));
}

/**
 * @returns {string[]}
 */
export function clearAllowedSites() {
    return saveAllowedSites([]);
}

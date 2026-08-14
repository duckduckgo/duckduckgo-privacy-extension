import { generateDNRRule, resourceTypes } from '@duckduckgo/ddg2dnr/lib/utils';
import { USER_BLOCKED_SITES_PRIORITY } from '@duckduckgo/ddg2dnr/lib/rulePriorities';
import { normalizeBlockedSite, parseBlockedSitesInput } from '../shared-utils/blocked-sites';
import { getCurrentlyBlockedDomains, normalizeGroups } from '../shared-utils/site-groups';
import settings from './settings';
import { USER_BLOCKED_SITES_RULE_ID, USER_BLOCKED_SITES_SUBRESOURCE_RULE_ID } from './dnr-utils';
import { getManifestVersion } from './wrapper';

const BLOCKED_SITE_PAGE_PATH = '/html/blocked.html';
const MAIN_FRAME_RESOURCE_TYPE = 'main_frame';

function normalizeDomains(domains) {
    const normalizedDomains = new Set();
    for (const value of domains) {
        const domain = normalizeBlockedSite(value);
        if (domain) {
            normalizedDomains.add(domain);
        }
    }
    return Array.from(normalizedDomains).sort();
}

/**
 * Read the persisted user blocklist.
 *
 * @returns {Promise<string[]>}
 */
export async function getBlockedSites() {
    await settings.ready();
    const groups = normalizeGroups(settings.getSetting('siteGroups'));
    if (groups.length > 0) {
        return getCurrentlyBlockedDomains(groups, settings.getSetting('groupUsage') || {}, Date.now());
    }

    const blockedSites = settings.getSetting('blockedSites') || {};
    const values = Array.isArray(blockedSites)
        ? blockedSites
        : Object.entries(blockedSites)
              .filter(([, enabled]) => enabled)
              .map(([domain]) => domain);
    return normalizeDomains(values);
}

/**
 * Replace the dynamic DNR rules for user-selected sites.
 * Top-level navigations are redirected to the extension's blocked page, while
 * all other requests to those domains remain blocked.
 *
 * @param {string[]} domains
 * @returns {Promise<string[]>}
 */
export async function refreshUserBlockedSitesRules(domains) {
    const normalizedDomains = normalizeDomains(domains);
    const addRules = [];

    if (normalizedDomains.length > 0) {
        addRules.push(
            generateDNRRule({
                id: USER_BLOCKED_SITES_RULE_ID,
                priority: USER_BLOCKED_SITES_PRIORITY,
                actionType: 'redirect',
                redirect: {
                    extensionPath: BLOCKED_SITE_PAGE_PATH,
                },
                requestDomains: normalizedDomains,
                resourceTypes: [MAIN_FRAME_RESOURCE_TYPE],
            }),
            generateDNRRule({
                id: USER_BLOCKED_SITES_SUBRESOURCE_RULE_ID,
                priority: USER_BLOCKED_SITES_PRIORITY,
                actionType: 'block',
                requestDomains: normalizedDomains,
                resourceTypes: resourceTypes.filter((resourceType) => resourceType !== MAIN_FRAME_RESOURCE_TYPE),
            }),
        );
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [USER_BLOCKED_SITES_RULE_ID, USER_BLOCKED_SITES_SUBRESOURCE_RULE_ID],
        addRules,
    });

    return normalizedDomains;
}

/**
 * Validate and persist a complete newline-separated user blocklist.
 *
 * @param {{ text?: unknown }} options
 * @returns {Promise<{ saved: boolean, domains: string[], invalidLines: string[], unsupported?: boolean }>}
 */
export async function setBlockedSites({ text } = {}) {
    await settings.ready();
    const { domains, invalidLines } = parseBlockedSitesInput(text);

    if (getManifestVersion() !== 3) {
        return {
            saved: false,
            domains: await getBlockedSites(),
            invalidLines: [],
            unsupported: true,
        };
    }

    if (invalidLines.length > 0) {
        return {
            saved: false,
            domains: await getBlockedSites(),
            invalidLines,
        };
    }

    const normalizedDomains = await refreshUserBlockedSitesRules(domains);
    const blockedSites = Object.fromEntries(normalizedDomains.map((domain) => [domain, true]));
    settings.updateSetting('blockedSites', blockedSites);

    return {
        saved: true,
        domains: normalizedDomains,
        invalidLines: [],
    };
}

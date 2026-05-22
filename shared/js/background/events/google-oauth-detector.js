/**
 * Google OAuth 3rd-party Cookie Heuristic
 *
 * Detects Google OAuth implicit/permission flows and temporarily allows
 * third-party cookies from google.com on the relying-party domain for a
 * limited time window (5 minutes).
 *
 * This replaces the blanket `excludedCookieDomains` exception for
 * accounts.google.com with a targeted, time-bounded approach.
 */
import { getFromSessionStorage, setToSessionStorage, getManifestVersion } from '../wrapper';
import { getNextSessionRuleId } from '../dnr-session-rule-id';
import { COOKIE_PRIORITY as COOKIE_BLOCK_PRIORITY } from '@duckduckgo/ddg2dnr/lib/cookies';

const STORAGE_KEY = 'googleOAuthAllowedDomains';
const ALLOWED_DOMAIN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OVERRIDE_PRIORITY = COOKIE_BLOCK_PRIORITY + 1;
const manifestVersion = getManifestVersion();

/**
 * In-memory mirror of allowed domains for synchronous access in webRequest handlers.
 * Kept in sync with sessionStorage on every write.
 * @type {Object<string, AllowedDomainEntry>}
 */
let allowedDomainsCache = {};

/**
 * @typedef {Object} AllowedDomainEntry
 * @property {number} addedAt - timestamp when the domain was added
 * @property {number|null} ruleId - DNR session rule ID (MV3 only)
 */

/**
 * Called on requests to accounts.google.com.
 * Detects OAuth implicit/permission flows and extracts the relying-party domain.
 * @param {string} url - the full URL of the request to accounts.google.com
 */
export async function onNavigationToGoogleAccounts(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return;
    }

    if (parsed.hostname !== 'accounts.google.com') return;

    const ssDomain = parsed.searchParams.get('ss_domain') || parsed.searchParams.get('app_domain');
    const responseType = parsed.searchParams.get('response_type');

    if (!ssDomain) return;
    // Authorization-code flows don't need 3p cookies
    if (responseType && responseType.includes('code')) return;

    let targetHost;
    try {
        targetHost = new URL(ssDomain).hostname;
    } catch (e) {
        return;
    }

    if (!targetHost) return;

    await addAllowedDomain(targetHost);
}

/**
 * Synchronous check: whether a request to google.com should be allowed
 * cookies because the site recently initiated a Google OAuth flow.
 * Uses the in-memory cache which is kept in sync with sessionStorage.
 * @param {string} requestUrl - the third-party request URL
 * @param {string} siteUrl - the top-level site URL
 * @returns {boolean}
 */
export function shouldAllowGoogleOAuthCookiesSync(requestUrl, siteUrl) {
    if (!requestUrl || !siteUrl) return false;

    let requestHost;
    try {
        requestHost = new URL(requestUrl).hostname;
    } catch (e) {
        return false;
    }

    if (!requestHost.endsWith('google.com')) return false;

    let siteHost;
    try {
        siteHost = new URL(siteUrl).hostname;
    } catch (e) {
        return false;
    }

    const entry = allowedDomainsCache[siteHost];
    if (!entry) return false;
    return Date.now() - entry.addedAt < ALLOWED_DOMAIN_TTL_MS;
}

/**
 * Add a domain to the temporary allowed list and install a DNR session rule (MV3).
 * @param {string} hostname
 */
async function addAllowedDomain(hostname) {
    const allowed = (await getFromSessionStorage(STORAGE_KEY)) || {};

    // Don't add duplicates that are still valid
    if (allowed[hostname] && Date.now() - allowed[hostname].addedAt < ALLOWED_DOMAIN_TTL_MS) {
        return;
    }

    allowed[hostname] = {
        addedAt: Date.now(),
        ruleId: null,
    };
    await setToSessionStorage(STORAGE_KEY, allowed);
    allowedDomainsCache = { ...allowed };

    if (manifestVersion === 3) {
        await installDNRSessionRule(hostname);
    }
}

/**
 * Get allowed domains, pruning any that have expired.
 * @returns {Promise<Object<string, AllowedDomainEntry>>}
 */
async function getValidAllowedDomains() {
    const allowed = (await getFromSessionStorage(STORAGE_KEY)) || {};
    const now = Date.now();
    let changed = false;

    for (const [domain, entry] of Object.entries(allowed)) {
        if (now - entry.addedAt > ALLOWED_DOMAIN_TTL_MS) {
            delete allowed[domain];
            changed = true;
            if (entry.ruleId && manifestVersion === 3) {
                await removeDNRSessionRule(entry.ruleId);
            }
        }
    }

    if (changed) {
        await setToSessionStorage(STORAGE_KEY, allowed);
    }

    allowedDomainsCache = { ...allowed };
    return allowed;
}

/**
 * Install a DNR session rule that allows google.com cookies when the request
 * is initiated by the given domain.
 * @param {string} targetDomain
 */
async function installDNRSessionRule(targetDomain) {
    const ruleId = getNextSessionRuleId();
    if (typeof ruleId !== 'number') {
        console.warn('Google OAuth heuristic: failed to get session rule ID');
        return;
    }

    try {
        await chrome.declarativeNetRequest.updateSessionRules({
            addRules: [
                {
                    id: ruleId,
                    priority: OVERRIDE_PRIORITY,
                    action: {
                        type: /** @type {chrome.declarativeNetRequest.RuleActionType} */ ('allow'),
                    },
                    condition: {
                        initiatorDomains: [targetDomain],
                        requestDomains: ['google.com'],
                        resourceTypes: /** @type {chrome.declarativeNetRequest.ResourceType[]} */ ([
                            'sub_frame',
                            'xmlhttprequest',
                            'script',
                            'image',
                            'other',
                        ]),
                    },
                },
            ],
        });
    } catch (e) {
        console.warn('Google OAuth heuristic: failed to install DNR rule', e);
        return;
    }

    // Store ruleId for later cleanup
    const allowed = (await getFromSessionStorage(STORAGE_KEY)) || {};
    if (allowed[targetDomain]) {
        allowed[targetDomain].ruleId = ruleId;
        await setToSessionStorage(STORAGE_KEY, allowed);
    }
}

/**
 * Remove a DNR session rule by ID.
 * @param {number} ruleId
 */
async function removeDNRSessionRule(ruleId) {
    try {
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [ruleId],
        });
    } catch (e) {
        // Rule may already have been removed
    }
}

/**
 * Clean up expired allowed domains and their associated DNR rules.
 * Called on extension startup to handle rules that should have expired
 * while the service worker was inactive.
 */
export async function cleanupExpiredGoogleOAuthDomains() {
    await getValidAllowedDomains();
}

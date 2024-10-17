import settings from './settings'

import {
    USER_ALLOWLISTED_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

import {
    updateExtensionConfigRules,
    updateCombinedConfigBlocklistRules
} from './dnr-config-rulesets'

import {
    USER_ALLOWLIST_RULE_ID,
    findExistingDynamicRule
} from './dnr-utils'
import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'

/**
 * Normalize and validate the given untrusted domain (e.g. from user input).
 * Returns the normalized domain, or null should the domain be considered
 * invalid.
 * @param {string} domain
 * @return {null|string}
 */
function normalizeUntrustedDomain (domain) {
    try {
        return new URL('https://' + domain).hostname
    } catch (e) {
        return null
    }
}

/**
 * Update the user allowlisting declarativeNetRequest rule to ensure the correct
 * domains are allowlisted.
 * @param {string[]} allowlistedDomains
 * @return {Promise}
 */
async function updateUserAllowlistRule (allowlistedDomains) {
    const addRules = []
    const removeRuleIds = [USER_ALLOWLIST_RULE_ID]

    if (allowlistedDomains.length > 0) {
        addRules.push(generateDNRRule({
            id: USER_ALLOWLIST_RULE_ID,
            priority: USER_ALLOWLISTED_PRIORITY,
            actionType: 'allowAllRequests',
            resourceTypes: ['main_frame'],
            requestDomains: allowlistedDomains
        }))
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds, addRules
    })
}

/**
 * Update the user allowlisting declarativeNetRequest rule to enable/disable
 * user allowlisting for the given domain.
 * @param {string} domain
 * @param {boolean} enable
 *   True if the domain is being added to the allowlist, false if it is being
 *   removed.
 * @return {Promise}
 */
export async function toggleUserAllowlistDomain (domain, enable) {
    const normalizedDomain = normalizeUntrustedDomain(domain)
    if (typeof normalizedDomain !== 'string') {
        return
    }

    // Figure out the correct set of allowlisted domains.
    const existingRule = await findExistingDynamicRule(USER_ALLOWLIST_RULE_ID)
    const allowlistedDomains = new Set(
        existingRule ? existingRule.condition.requestDomains : []
    )
    allowlistedDomains[enable ? 'add' : 'delete'](normalizedDomain)

    await updateUserAllowlistRule(Array.from(allowlistedDomains))
}

/**
 * Reset the user allowlisting declarativeNetRequest rule to match the given
 * array of user allowlisted domains.
 * @param {string[]} allowlistedDomains
 * @return {Promise}
 */
export async function refreshUserAllowlistRules (allowlistedDomains) {
    // Normalise and validate the domains. We're passing the user provided
    // domains through to the declarativeNetRequest API, so it's important to
    // prevent invalid input sneaking through.
    const normalizedAllowlistedDomains = /** @type {string[]} */ (
        allowlistedDomains
            .map(normalizeUntrustedDomain)
            .filter(domain => typeof domain === 'string')
    )

    await updateUserAllowlistRule(normalizedAllowlistedDomains)
}

/**
 * Retrieve a normalized and sorted list of user denylisted domains.
 * @returns {string[]}
 */
export function getDenylistedDomains () {
    const denylist = settings.getSetting('denylisted') || {}

    const denylistedDomains = []
    for (const [domain, enabled] of Object.entries(denylist)) {
        if (enabled) {
            const normalizedDomain = normalizeUntrustedDomain(domain)
            if (normalizedDomain) {
                denylistedDomains.push(normalizedDomain)
            }
        }
    }

    return denylistedDomains.sort()
}

/**
 * Update all the extension configuration rulesets, so that the
 * declarativeNetRequest rules generated for the contentBlocking and
 * unprotectedTemporary allowlisting features take care to exclude the
 * user "denylisted" domains.
 * @return {Promise}
 */
export async function updateUserDenylist () {
    await updateExtensionConfigRules()
    await updateCombinedConfigBlocklistRules()
}

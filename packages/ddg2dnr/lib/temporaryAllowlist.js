/** @module temporaryAllowlist */

// The contentBlocking allowlist only disables tracker blocking for a website.
const CONTENT_BLOCKING_ALLOWLIST_PRIORITY = 30000
// The unprotectedTemporary allowlist disables all protections for a website.
const UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY = 1000000

const {
    generateDNRRule
} = require('./utils')

/**
 * @typedef generateTemporaryAllowlistRulesResult
 * @property {import('./utils').DNRRule} rule
 * @property {object} matchDetails
 */

/**
 * Generator to produce the declarativeNetRequest rules and corresponding match
 * details for the unprotectedTemporary and contentBlocking sections of the
 * extension configuration.
 * @param {object} extensionConfiguration
 *   The extension configuration.
 * @return {Generator<generateTemporaryAllowlistRulesResult>}
 */
function* generateTemporaryAllowlistRules (
    { features: { contentBlocking }, unprotectedTemporary }, denylistedDomains
) {
    const denylistedDomainsSet = new Set(denylistedDomains)

    const configs = [{
        type: 'unprotectedTemporary',
        priority: UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY,
        entries: unprotectedTemporary || []
    }]

    if (contentBlocking && contentBlocking.state === 'enabled') {
        configs.push({
            type: 'contentBlocking',
            priority: CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
            entries: contentBlocking.exceptions || []
        })
    }

    for (const { type, priority, entries } of configs) {
        for (const { domain, reason } of entries) {
            if (denylistedDomainsSet.has(domain)) continue

            const matchDetails = { type, domain, reason }
            const rule = generateDNRRule({
                priority,
                actionType: 'allowAllRequests',
                requestDomains: [domain],
                resourceTypes: ['main_frame']
            })
            yield { rule, matchDetails }
        }
    }
}

exports.CONTENT_BLOCKING_ALLOWLIST_PRIORITY =
    CONTENT_BLOCKING_ALLOWLIST_PRIORITY
exports.UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY =
    UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY
exports.generateTemporaryAllowlistRules = generateTemporaryAllowlistRules

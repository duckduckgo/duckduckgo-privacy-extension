/** @module extensionConfiguration */

const { generateTrackerAllowlistRules } = require('./trackerAllowlist')
const { generateTemporaryAllowlistRules } = require('./temporaryAllowlist')
const { generateGPCheaderRules } = require('./gpc')
const { generateTrackingParameterRules } = require('./trackingParams')

/**
 * Generated an extension configuration declarativeNetRequest ruleset.
 * @param {object} extensionConfig
 *   The extension configuration.
 * @param {string[]} denylistedDomains
 *   Domains that the user has specifically denylisted. These domains should be
 *   excluded from any contentBlocking/unprotectedTemporary allowlisting rules.
 * @param {function} isRegexSupported
 *   A function compatible with chrome.declarativeNetRequest.isRegexSupported.
 *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#method-isRegexSupported
 * @param {number} [startingRuleId = 1]
 *   Rule ID for the generated declarativeNetRequest rules to start from. Rule
 *   IDs are incremented sequentially from the starting point.
 * @return {Promise<import('./utils.js').RulesetResult>}
 */

async function generateExtensionConfigurationRuleset (
    extensionConfig, denylistedDomains, isRegexSupported, startingRuleId = 1
) {
    if (typeof isRegexSupported !== 'function') {
        throw new Error('Missing isRegexSupported function.')
    }

    let ruleId = startingRuleId
    const ruleset = []
    /** @type {import('./utils').MatchDetailsByRuleId} */
    const matchDetailsByRuleId = {}

    const appendRuleResult = result => {
        if (result) {
            const { matchDetails, rule } = result
            rule.id = ruleId++
            ruleset.push(rule)
            matchDetailsByRuleId[rule.id] = matchDetails
        }
    }

    // Tracker Allowlist.
    for (const result of generateTrackerAllowlistRules(extensionConfig)) {
        appendRuleResult(result)
    }

    // Content Blocking and Unprotected Temporary allowlists.
    for (const result of generateTemporaryAllowlistRules(extensionConfig, denylistedDomains)) {
        appendRuleResult(result)
    }

    for (const result of generateGPCheaderRules(extensionConfig)) {
        appendRuleResult(result)
    }

    for (const result of generateTrackingParameterRules(extensionConfig)) {
        appendRuleResult(result)
    }

    return { ruleset, matchDetailsByRuleId }
}

exports.generateExtensionConfigurationRuleset =
    generateExtensionConfigurationRuleset

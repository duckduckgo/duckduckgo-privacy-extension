/** @module extensionConfiguration */

const { generateTrackerAllowlistRules } = require('./trackerAllowlist')

/**
 * @typedef {object} generateExtensionConfigurationRulesetResult
 * @property {object[]} ruleset
 *   The generated declarativeNetRequest ruleset.
 * @property {object} matchDetailsByRuleId
 *   Rule ID -> match details.
 */

/**
 * Generated an extension configuration declarativeNetRequest ruleset.
 * @param {object} extensionConfig
 *   The extension configuration.
 * @param {number} [startingRuleId = 1]
 *   Rule ID for the generated declarativeNetRequest rules to start from. Rule
 *   IDs are incremented sequentially from the starting point.
 * @return {generateExtensionConfigurationRulesetResult}
 */

async function generateExtensionConfigurationRuleset (
    extensionConfig, startingRuleId = 1
) {
    let ruleId = startingRuleId
    const ruleset = []
    const matchDetailsByRuleId = {}

    // Tracker Allowlist.
    for (const result of generateTrackerAllowlistRules(extensionConfig)) {
        if (!result) continue

        const [rule, matchDetails] = result
        rule.id = ruleId++
        ruleset.push(rule)
        matchDetailsByRuleId[rule.id] = matchDetails
    }

    return { ruleset, matchDetailsByRuleId }
}

exports.generateExtensionConfigurationRuleset =
    generateExtensionConfigurationRuleset

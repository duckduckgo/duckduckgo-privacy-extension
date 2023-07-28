import settings from './settings'

// Rule IDs notes:
// - Individual hardcoded rule IDs live here.
// - Ensure they are within the range of 20001 to 21000, otherwise
//   they could clash by the rule ID ranges used by dnr-config.js.
// - While dynamic and session rules are considered as being different
//   rulesets, and therefore can have overlapping rule IDs, the
//   convention here is to keep the rule IDs unique.
// - When adding a dynamic rule ID here, ensure to also add it to the
//   RESERVED_DYNAMIC_RULE_IDS array. Otherwise the rule will be
//   cleared when the extension install event fires.
//   Note: This is _not_ necessary for session rule IDs.
// - While other rule ID ranges are defined elsewhere (e.g. in
//   dnr-config.js and dnr-session-rule-id.js), keep other hard-coded
//   rule IDs together here. Otherwise it's easy to miss clashing rule
//   IDs.

// User allowlisting and the ServicerWorker initiated request exception both
// only require one declarativeNetRequest rule, so hardcode the rule IDs here.
export const USER_ALLOWLIST_RULE_ID = 20001
export const ATB_PARAM_RULE_ID = 20003
export const NEWTAB_TRACKER_STATS_REDIRECT_RULE_ID = 20006

// Rule IDs for static session rules
export const SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID = 20002
export const HTTPS_SESSION_ALLOWLIST_RULE_ID = 20004
export const HTTPS_SESSION_UPGRADE_RULE_ID = 20005

export const SETTING_PREFIX = 'declarative_net_request-'

// Allocate blocks of rule IDs for the different configurations. That way, the
// rules associated with a configuration can be safely cleared without the risk
// of removing rules associated with different configurations.
export const ruleIdRangeByConfigName = {
    tds: [1, 10000],
    config: [10001, 20000],
    _RESERVED: [20001, 21000],
    combined: [21001, 31000]
}

// Valid dynamic rule IDs - others will be removed on extension start
const RESERVED_DYNAMIC_RULE_IDS = [
    USER_ALLOWLIST_RULE_ID,
    ATB_PARAM_RULE_ID,
    NEWTAB_TRACKER_STATS_REDIRECT_RULE_ID
]

/**
 * Find an existing session or dynamic declarativeNetRequest rule with the given rule ID
 * and return it.
 * @param {number} desiredRuleId
 * @returns {Promise<chrome.declarativeNetRequest.Rule | undefined>}
 */
async function findExistingRule (isSessionRule = false, desiredRuleId) {
    // TODO: Pass a rule ID filter[1] (to avoid querying all rules) once
    //       Chrome >= 111 is the minimum supported version.
    //       See https://crbug.com/1379699
    // 1 - https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-GetRulesFilter
    const rules = await chrome.declarativeNetRequest[isSessionRule ? 'getSessionRules' : 'getDynamicRules']()
    return rules.find(r => r.id === desiredRuleId)
}

export const findExistingDynamicRule = findExistingRule.bind(null, false)
export const findExistingSessionRule = findExistingRule.bind(null, true)

/**
 * @typedef {object} getMatchDetailsTrackerBlockingResult
 * @property {string} type
 *   The match type 'trackerBlocking'.
 * @property {string[]} possibleTrackerDomains
 *   The list of possible tracking domains associated with this match.
 */

/**
 * @typedef {object} getMatchDetailsExtensionConfigurationResult
 * @property {string} type
 *   The match type, for example 'trackerAllowlist'.
 * @property {string} domain
 *   The matching tracker domain.
 * @property {string} reason
 *   The reason for the match.
 */

/**
 * @typedef {object} getMatchDetailsResult
 * @property {string} type
 *   The match type, e.g. 'unknown' or 'userAllowlist'.
 */

/**
 * Find the match details (if any) associated with the given
 * declarativeNetRequest rule ID.
 * @param {number} ruleId
 * @return {Promise<getMatchDetailsResult |
 *                  getMatchDetailsExtensionConfigurationResult |
 *                  getMatchDetailsTrackerBlockingResult>}
 */
export async function getMatchDetails (ruleId) {
    await settings.ready()

    if (ruleId === USER_ALLOWLIST_RULE_ID) {
        return {
            type: 'userAllowlist'
        }
    }

    if (ruleId === SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID) {
        return {
            type: 'serviceWorkerInitiatedAllowing'
        }
    }

    if (ruleId === ATB_PARAM_RULE_ID) {
        return {
            type: 'atbParam'
        }
    }

    for (const [configName, [ruleIdStart, ruleIdEnd]]
        of Object.entries(ruleIdRangeByConfigName)) {
        if (ruleId >= ruleIdStart && ruleId <= ruleIdEnd) {
            const settingName = SETTING_PREFIX + configName
            const settingValue = settings.getSetting(settingName)
            const matchDetails = settingValue?.matchDetailsByRuleId?.[ruleId]
            if (matchDetails) {
                if (configName === 'tds') {
                    return {
                        type: 'trackerBlocking',
                        possibleTrackerDomains: matchDetails.split(',')
                    }
                }

                return JSON.parse(JSON.stringify(matchDetails))
            }
        }
    }

    return { type: 'unknown' }
}

/**
 * Find any dynamic rules outside of the existing expected rule range and remove them.
 */
export async function clearInvalidDynamicRules () {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const invalidRules = existingRules.filter((rule) => {
        if (rule.id >= ruleIdRangeByConfigName.combined[1]) {
            // greater than the max rule ID
            return true
        }
        if (rule.id >= ruleIdRangeByConfigName._RESERVED[0] && rule.id <= ruleIdRangeByConfigName._RESERVED[1]) {
            // in the reserved rule range, only explictly defined IDs are allowed
            return !RESERVED_DYNAMIC_RULE_IDS.includes(rule.id)
        }
        return false
    }).map((rule) => rule.id)
    if (invalidRules.length > 0) {
        console.log('Removing invliad rule ids', invalidRules)
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: invalidRules })
    }
}

import * as browserWrapper from './wrapper.es6'
import settings from './settings.es6'
import tdsStorage from './storage/tds.es6'
import trackers from './trackers.es6'
import * as startup from './startup'

import {
    generateExtensionConfigurationRuleset
} from '@duckduckgo/ddg2dnr/lib/extensionConfiguration'
import {
    generateTdsRuleset
} from '@duckduckgo/ddg2dnr/lib/tds'
import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'
import {
    USER_ALLOWLISTED_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

export const SETTING_PREFIX = 'declarative_net_request-'

// Allocate blocks of rule IDs for the different configurations. That way, the
// rules associated with a configuration can be safely cleared without the risk
// of removing rules associated with different configurations.
const ruleIdRangeByConfigName = {
    tds: [1, 10000],
    config: [10001, 20000]
}

// User allowlisting only requires one declarativeNetRequest rule, so hardcode
// the rule ID here.
export const USER_ALLOWLIST_RULE_ID = 20001

/**
 * A dummy etag rule is saved with the declarativeNetRequest rules generated for
 * each configuration. That way, a consistent extension state (between tds
 * configurations, extension settings and declarativeNetRequest rules) can be
 * ensured.
 * @param {number} id
 * @param {string} etag
 * @returns {import('@duckduckgo/ddg2dnr/lib/utils.js').DNRRule}
 */
function generateEtagRule (id, etag) {
    return generateDNRRule({
        id,
        priority: 1,
        actionType: 'allow',
        urlFilter: etag,
        requestDomains: ['etag.invalid']
    })
}

/**
 * Find an existing dynamic declarativeNetRequest rule with the given rule ID
 * and return it.
 * @param {number} desiredRuleId
 * @returns {Promise<import('@duckduckgo/ddg2dnr/lib/utils.js').DNRRule|null>}
 */
async function findExistingDynamicRule (desiredRuleId) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()

    for (const rule of existingRules) {
        if (rule.id === desiredRuleId) {
            return rule
        }
    }

    return null
}

/**
 * Check if the declarativeNetRequest rules for a configuration need to be
 * updated. Returns true if so, false if they are already up to date.
 * @param {string} configName
 * @param {Object} expectedState
 * @returns {Promise<boolean>}
 */
async function configRulesNeedUpdate (configName, expectedState) {
    const settingName = SETTING_PREFIX + configName
    await settings.ready()
    const settingValue = settings.getSetting(settingName)

    // No setting saved for the configuration yet, this is likely the first time
    // it has been updated - rules definitely need to be updated.
    if (!settingValue) {
        return true
    }

    // To be sure the rules are up to date, there must be an expected etag.
    if (!expectedState.etag) {
        return true
    }

    // If any of the setting values aren't as expected, the rules could be out
    // of date.
    for (const [key, value] of Object.entries(expectedState)) {
        if (settingValue[key] !== value) {
            return true
        }
    }

    // Find the etag rule for this configuration.
    const [etagRuleId] = ruleIdRangeByConfigName[configName]
    const existingEtagRule = await findExistingDynamicRule(etagRuleId)

    // If none exists, the rules definitely need to be updated.
    if (!existingEtagRule) {
        return true
    }

    // Otherwise, the rules only need be updated if the etags no longer match.
    return existingEtagRule.condition.urlFilter !== expectedState.etag
}

/**
 * Update the declarativeNetRequest rules and corresponding state in settings
 * for a configuration.
 * @param {string} configName
 * @param {Object} latestState
 * @param {import('@duckduckgo/ddg2dnr/lib/utils.js').DNRRule[]} rules
 * @param {Object} matchDetailsByRuleId
 * @returns {Promise<>}
 */
async function updateConfigRules (
    configName, latestState, rules, matchDetailsByRuleId
) {
    const [ruleIdStart, ruleIdEnd] = ruleIdRangeByConfigName[configName]
    const etagRuleId = ruleIdStart
    const maxNumberOfRules = ruleIdEnd - ruleIdStart

    const { etag } = latestState

    if (!rules) {
        console.error(
            'No declarativeNetRequest rules generated for configuration: ',
            configName, '(Etag: ', etag, ')'
        )
        return
    }

    // Add the new etag rule.
    rules.push(generateEtagRule(etagRuleId, etag))

    if (rules.length > maxNumberOfRules) {
        console.error(
            'Too many declarativeNetRequest rules generated for configuration: ',
            configName,
            '(Etag: ', etag, ', Rules generated: ', rules.length, ')'
        )
        return
    }

    // Ensure any existing rules for the configuration are removed.
    const removeRuleIds = []
    for (let i = ruleIdStart; i <= ruleIdEnd; i++) {
        removeRuleIds.push(i)
    }

    // Install the updated rules.
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds, addRules: rules
    })

    // Then update the setting entry.
    const settingName = SETTING_PREFIX + configName
    const settingValue = {
        matchDetailsByRuleId
    }
    for (const key of Object.keys(latestState)) {
        settingValue[key] = latestState[key]
    }
    await settings.ready()
    settings.updateSetting(settingName, settingValue)
}

/**
 * Retrieve a normalized and sorted list of user denylisted domains.
 * @returns {Promise<string[]>}
 */
async function getDenylistedDomains () {
    await settings.ready()
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
 * Utility function to regenerate the declarativeNetRequest rules for the
 * extension configuration (extension-config.json). The configuration's value
 * and etag can optionally be passed in (e.g. when the configuration has just
 * been updated), but will be read from settings storage otherwise.
 * @param {string?} etag
 * @param {object?} configValue
 * @returns {Promise<>}
 */
async function updateExtensionConfigRules (etag = null, configValue = null) {
    const extensionVersion = browserWrapper.getExtensionVersion()
    const denylistedDomains = await getDenylistedDomains()

    const latestState = {
        extensionVersion,
        denylistedDomains: denylistedDomains.join(),
        etag
    }

    if (!configValue) {
        await tdsStorage.ready('config')
        configValue = await tdsStorage.getListFromLocalDB('config')
    }

    if (!etag) {
        const settingName = SETTING_PREFIX + 'config'
        await settings.ready()
        await tdsStorage.ready('config')
        const settingValue = settings.getSetting(settingName)
        if (!settingValue?.etag) {
            // Should not be possible, but if the etag is unknown at this point
            // there's not much that can be done.
            return
        }
        latestState.etag = settingValue.etag
    }

    if (!(await configRulesNeedUpdate('config', latestState))) {
        return
    }

    const [ruleIdStart] = ruleIdRangeByConfigName.config
    const {
        ruleset, matchDetailsByRuleId
    } = await generateExtensionConfigurationRuleset(
        configValue,
        denylistedDomains,
        chrome.declarativeNetRequest.isRegexSupported,
        ruleIdStart + 1
    )

    await updateConfigRules(
        'config', latestState, ruleset, matchDetailsByRuleId
    )
}

/**
 * tdsStorage.onUpdate listener which is called when the configurations are
 * updated and when the background ServiceWorker is restarted.
 * Note: Only exported for use by unit tests, do not call manually.
 * @param {'config'|'tds'} configName
 * @param {string} etag
 * @param {object} configValue
 * @returns {Promise}
 */
export async function onConfigUpdate (configName, etag, configValue) {
    // TDS (aka the block list).
    if (configName === 'tds') {
        const extensionVersion = browserWrapper.getExtensionVersion()
        const [ruleIdStart] = ruleIdRangeByConfigName[configName]
        const latestState = { etag, extensionVersion }
        if (!(await configRulesNeedUpdate(configName, latestState))) {
            return
        }

        await startup.ready()
        // @ts-ignore: Once startup.ready() has finished, surrogateList will be
        //             assigned.
        const supportedSurrogates = new Set(Object.keys(trackers.surrogateList))

        const {
            ruleset, matchDetailsByRuleId
        } = await generateTdsRuleset(
            configValue,
            supportedSurrogates,
            '/web_accessible_resources/',
            chrome.declarativeNetRequest.isRegexSupported,
            ruleIdStart + 1
        )

        await updateConfigRules(configName, latestState, ruleset, matchDetailsByRuleId)

    // Extension configuration.
    } else if (configName === 'config') {
        await updateExtensionConfigRules(etag, configValue)
    }
}

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
 * Update all contentBlocking and unprotectedTemporary allowlisting rules so
 * that user "denylisted" domains are excluded.
 * @return {Promise}
 */
export async function updateUserDenylist () {
    await updateExtensionConfigRules()
}

if (browserWrapper.getManifestVersion() === 3) {
    tdsStorage.onUpdate('config', onConfigUpdate)
    tdsStorage.onUpdate('tds', onConfigUpdate)
}

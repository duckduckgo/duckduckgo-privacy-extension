import * as browserWrapper from './wrapper.es6'
import settings from './settings.es6'
import tdsStorage from './storage/tds.es6'
import trackers from './trackers.es6'
import * as startup from './startup'
import { isValidSessionId } from './dnr-session-rule-id'

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
 * tdsStorage.onUpdate listener which is called when the configurations are
 * updated and when the background ServiceWorker is restarted.
 * Note: Only exported for use by unit tests, do not call manually.
 * @param {'config'|'tds'} configName
 * @param {string} etag
 * @param {object} configValue
 * @returns {Promise}
 */
export async function onConfigUpdate (configName, etag, configValue) {
    await settings.ready()

    const [ruleIdStart, ruleIdEnd] = ruleIdRangeByConfigName[configName]
    const etagRuleId = ruleIdStart
    const maxNumberOfRules = ruleIdEnd - ruleIdStart

    const settingName = SETTING_PREFIX + configName
    const settingValue = settings.getSetting(settingName)

    const extensionVersion = browserWrapper.getExtensionVersion()
    const previousSettingEtag = settingValue?.etag
    const previousExtensionVersion = settingValue?.extensionVersion

    // If both the settings entry and declarativeNetRequest rules are present
    // and the etags all match, everything is already up to date.
    // Note: We also check the extension version here, so that if the extension
    //       is updated and the ddg2dnr dependency was updated, we have the
    //       opportunity to regenerate the rulesets with the latest code.
    if (previousSettingEtag &&
        previousSettingEtag === etag &&
        previousExtensionVersion &&
        previousExtensionVersion === extensionVersion) {
        const existingEtagRule = await findExistingDynamicRule(etagRuleId)
        const previousRuleEtag =
            existingEtagRule && existingEtagRule.condition.urlFilter

        // No change, rules are already current.
        if (previousRuleEtag && previousRuleEtag === etag) {
            return
        }
    }

    // Otherwise, it is necessary to update the declarativeNetRequest rules and
    // settings again.

    let addRules
    let lookup
    let inverseCustomRules = []

    // TDS.
    if (configName === 'tds') {
        await startup.ready()
        // @ts-ignore: Once startup.ready() has finished, surrogateList will be
        //             assigned.
        const supportedSurrogates = new Set(Object.keys(trackers.surrogateList))

        const {
            ruleset, matchDetailsByRuleId, inverseCustomActionRules
        } = await generateTdsRuleset(
            configValue,
            supportedSurrogates,
            '/web_accessible_resources/',
            chrome.declarativeNetRequest.isRegexSupported,
            ruleIdStart + 1
        )
        addRules = ruleset
        lookup = matchDetailsByRuleId
        inverseCustomRules = inverseCustomActionRules
    // Extension configuration.
    } else if (configName === 'config') {
        const {
            ruleset, matchDetailsByRuleId
        } = await generateExtensionConfigurationRuleset(
            configValue,
            chrome.declarativeNetRequest.isRegexSupported,
            ruleIdStart + 1
        )
        addRules = ruleset
        lookup = matchDetailsByRuleId
    }

    if (!addRules) {
        console.error(
            'No declarativeNetRequest rules generated for configuration: ',
            configName, '(Etag: ', etag, ')'
        )
        return
    }

    // Add the new etag rule.
    addRules.push(generateEtagRule(etagRuleId, etag))

    if (addRules.length > maxNumberOfRules) {
        console.error(
            'Too many declarativeNetRequest rules generated for configuration: ',
            configName,
            '(Etag: ', etag, ', Rules generated: ', addRules.length, ')'
        )
        return
    }

    // Ensure any existing rules for the configuration are removed.
    const removeRuleIds = []
    for (let i = ruleIdStart; i <= ruleIdEnd; i++) {
        removeRuleIds.push(i)
    }

    // Install the updated rules and then update the setting entry.
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds, addRules
    })
    settings.updateSetting(settingName, { etag, lookup, extensionVersion })
    if (inverseCustomRules && inverseCustomRules.length) {
        settings.updateSetting('inverseCustomRules', inverseCustomRules)
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
            const matchDetails = settingValue?.lookup?.[ruleId]
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
* Remove orphaned session ids
* We increment the rule IDs for some session rules, starting at STARTING_RULE_ID and
* keep a note of the next rule ID in session storage. During extesion update/restarts
* session storage is cleared, while session rules are not, which causes errors due to
* session rule ID conflicts
 * @return {Promise}
 */

export async function flushSessionRules () {
    chrome.declarativeNetRequest.getSessionRules().then(rules => {
        if (rules.length) {
            const ruleIds = rules.map(({ id }) => id).filter(isValidSessionId)
            return chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds })
        }
    })
}

if (browserWrapper.getManifestVersion() === 3) {
    tdsStorage.onUpdate('config', onConfigUpdate)
    tdsStorage.onUpdate('tds', onConfigUpdate)
}

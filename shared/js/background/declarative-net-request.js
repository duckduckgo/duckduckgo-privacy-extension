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

export const SETTING_PREFIX = 'declarative_net_request-'

// Allocate blocks of rule IDs for the different configurations. That way, the
// rules associated with a configuration can be safely cleared without the risk
// of removing rules associated with different configurations.
const ruleIdRangeByConfigName = {
    tds: [1, 10000],
    config: [10001, 20000]
}

// A dummy etag rule is saved with the declarativeNetRequest rules generated for
// each configuration. That way, a consistent extension state (between tds
// configurations, extension settings and declarativeNetRequest rules) can be
// ensured.
function generateEtagRule (id, etag) {
    return {
        id,
        priority: 1,
        condition: {
            urlFilter: etag,
            requestDomains: ['etag.invalid']
        },
        action: { type: 'allow' }
    }
}

/**
 * tdsStorage.onUpdate listener which is called when the configurations are
 * updated and when the background ServiceWorker is restarted.
 * @param {'config'|'tds'} configName
 * @param {string} etag
 * @param {object} configValue
 */
async function onUpdate (configName, etag, configValue) {
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
        const existingRules =
              await chrome.declarativeNetRequest.getDynamicRules()
        let previousRuleEtag = null
        for (const rule of existingRules) {
            if (rule.id === etagRuleId) {
                previousRuleEtag = rule.condition.urlFilter
                break
            }
        }

        // No change, rules are already current.
        if (previousRuleEtag && previousRuleEtag === etag) {
            return
        }
    }

    // Otherwise, it is necessary to update the declarativeNetRequest rules and
    // settings again.

    let addRules
    let lookup

    // TDS.
    if (configName === 'tds') {
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
        addRules = ruleset
        lookup = matchDetailsByRuleId
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
 * @typedef {object} getMatchDetailsUnknownResult
 * @property {string} type
 *   The match type 'unknown'.
 */

/**
 * Find the match details (if any) associated with the given
 * declarativeNetRequest rule ID.
 * @param {number} ruleId
 * @return {Promise<getMatchDetailsUnknownResult |
 *                  getMatchDetailsExtensionConfigurationResult |
 *                  getMatchDetailsTrackerBlockingResult>}
 */
export async function getMatchDetails (ruleId) {
    await settings.ready()

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

if (browserWrapper.getManifestVersion() === 3) {
    tdsStorage.onUpdate('config', onUpdate)
    tdsStorage.onUpdate('tds', onUpdate)
}

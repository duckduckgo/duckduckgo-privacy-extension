import settings from '../settings.es6'
import tabManager from '../tab-manager.es6'

const { getNextSessionRuleId } = require('../dnr-session-rule-id')

/**
 * Return the map of inverse custom rules for a given action
 * @param {string} action
 * @return {Object[]}
 */
function getInverseRules (action) {
    const inverseCustomRules = JSON.parse(JSON.stringify(settings.getSetting('inverseCustomRules')))
    return inverseCustomRules[action]
}

/**
 * For a given tabId and customAction, add the corresponding session rules to the
 * provided tab, unless those rules have already been added to it
 * This is used by CTL for example to override certain rules when a user has clicked through
 * @param {string} customAction
 * @param {number} tabId
 * @return {Promise}
 */
export async function enableInverseRules (customAction, tabId) {
    const tab = tabManager.get({ tabId })
    const rules = tab.customActionRules || {}
    if (rules[customAction]) {
        return
    }

    const ruleIds = []
    const inverseRules = getInverseRules(customAction)
        .map(rule => {
            rule.id = getNextSessionRuleId()
            ruleIds.push(rule.id)
            delete rule.customAction
            return rule
        })

    rules[customAction] = ruleIds
    tab.customActionRules = rules

    await chrome.declarativeNetRequest.updateSessionRules({ addRules: inverseRules }).then(() => {
        console.warn('inverse rules ENABLED for', customAction, tabId)
    })
}

/**
 * For a given tab, we remove any session rules that were added by enableInverseRules
 * This is called during page navigation or example, to remove any temporary loading exceptions
 * @param {Object} tab
 * @return {Promise}
 */
export function removeInverseRules (tab) {
    const customRulesIds = []
    for (const ruleSet in tab.customActionRules) {
        customRulesIds.push(...tab.customActionRules[ruleSet])
    }
    tab.customActionRules = {}
    return chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: customRulesIds })
}

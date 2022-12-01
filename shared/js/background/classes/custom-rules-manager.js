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
 */
 export async function enableInverseRules (customAction, tabId) {
    const tab = tabManager.get({ tabId })
    const rules = tab.customActionRules || {}
    if (rules[customAction]) {
        console.warn('session rules already exists for', customAction)
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

    setInterval(() => {
        const currentTab = tabManager.get({ tabId: tabId })
        console.warn('current inverse rules', currentTab.id, currentTab.customActionRules)
        chrome.declarativeNetRequest.getSessionRules().then((r) => console.warn('DNR sesh rules', r))
    }, 5000)

    rules[customAction] = ruleIds
    tab.customActionRules = rules

    console.warn('enableInverseRules updated for tab', tab.id, tab.customActionRules)
    await chrome.declarativeNetRequest.updateSessionRules({ addRules: inverseRules })
}

/**
 * For a given tab, we remove any session rules that were added by enableInverseRules
 * This is called during page navigation or example, to remove any temporary loading exceptions
 * @param {Object} tab
 */
export async function removeInverseRules (tab) {
    const customRulesIds = []
    for (const ruleSet in tab.customActionRules) {
        customRulesIds.push(...tab.customActionRules[ruleSet])
    }
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: customRulesIds })
}

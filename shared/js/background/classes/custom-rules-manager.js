import settings from '../settings.es6'
import tabManager from '../tab-manager.es6'

const { getNextSessionRuleId } = require('../dnr-session-rule-id')

function getInverseRules (action) {
    const inverseCustomRules = JSON.parse(JSON.stringify(settings.getSetting('inverseCustomRules')))
    return inverseCustomRules?.filter(rule => rule.customAction === action)
}

export function enableInverseRules (customAction, tabId) {
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
    return chrome.declarativeNetRequest.updateSessionRules({ addRules: inverseRules })
}

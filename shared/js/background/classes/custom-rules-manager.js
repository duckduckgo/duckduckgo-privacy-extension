import settings from '../settings.es6'
const tabManager = require('../tab-manager.es6')

import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'
const { getNextSessionRuleId } = require('../dnr-session-rule-id')

function getInverseRules (action) {
    const inverseCustomRules = JSON.parse(JSON.stringify(settings.getSetting('inverseCustomRules')))
    return inverseCustomRules?.filter(rule => rule.customAction === action)
}

export function enableInverseRules (customAction, tabId) {
    const tab = tabManager.get({ tabId })
    const rules = tab.customActionRules || {}
    if(rules[customAction]) {
        console.warn('session rules already exists for', customAction)
        return
    }

    let ruleIds = []
    const inverseRules = getInverseRules(customAction)
        .map(rule => {
            rule.id = getNextSessionRuleId()
            ruleIds.push(rule.id)
            delete rule.customAction // temporary
            return rule
        })

    setInterval(() => {
        const tab = tabManager.get({ tabId: tabId })
        console.warn('current inverse rules', tab.id, tab.customActionRules)
        chrome.declarativeNetRequest.getSessionRules().then((r) => console.warn('DNR sesh rules', r))
    }, 5000)
    rules[customAction] = ruleIds
    tab.customActionRules = rules
    console.warn('enableInverseRules updated for tab', tab.id, tab.customActionRules)
    return chrome.declarativeNetRequest.updateSessionRules({ addRules: inverseRules })
}

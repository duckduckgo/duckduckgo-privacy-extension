import settings from '../settings.es6'
import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'
const { getNextSessionRuleId } = require('../dnr-session-rule-id')

function getInverseRules (action) {
    const inverseCustomRules = settings.getSetting('inverseCustomRules')
    return inverseCustomRules?.filter(rule => rule.customAction === action)
}

export function enableInverseRules (customAction, tabId) {
    const inverseRules = getInverseRules(customAction)

    const inverseDNRRules = inverseRules.map(rule => createDNRRule(rule, tabId))

    chrome.declarativeNetRequest.updateSessionRules({ addRules: inverseDNRRules })
}

function createDNRRule (rule, tabId) {
    const adClickDNR = {
        rule: generateDNRRule({
            id: getNextSessionRuleId(),
            priority: rule.priority+10,
            actionType: rule.action,
            // requestDomains: this.allowlist.map((entry) => entry.host)
        })
    }
    adClickDNR.rule.condition.tabIds = [tabId]
    return adClickDNR
}
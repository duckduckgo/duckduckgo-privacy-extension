const browserWrapper = require('./wrapper.es6')
const DYNAMIC_RULE_ID_START = 100000
const DYNAMIC_RULE_STORAGE_KEY = 'dynamicRuleOffset'
let dynamicRuleOffset

export function getDynamicRuleId () {
    const nextRuleId = DYNAMIC_RULE_ID_START + dynamicRuleOffset
    dynamicRuleOffset += 1
    browserWrapper.setToSessionStorage(DYNAMIC_RULE_STORAGE_KEY, dynamicRuleOffset)
    return nextRuleId
}

async function _getExistingRulesAssigned () {
    let rules = []

    // get all declarative rules
    const set1 = await chrome.declarativeNetRequest.getDynamicRules()
    rules = rules.concat(set1.filter(r => r.id >= DYNAMIC_RULE_ID_START))
    const set2 = await chrome.declarativeNetRequest.getSessionRules()

    // get all rules that were already dynamically created
    rules = rules.concat(set2.filter(r => r.id >= DYNAMIC_RULE_ID_START))
    return rules
}

// set offset and update based on rules that have been created
(async () => {
    // get existing offset in storage
    dynamicRuleOffset = await browserWrapper.getFromSessionStorage(DYNAMIC_RULE_STORAGE_KEY) || 0

    // get any dynamic rules that have been created
    const rulesAssigned = await _getExistingRulesAssigned()

    // get offsets for dynamic rules already created
    const offsetsAssigned = rulesAssigned.map(r => (r.id - DYNAMIC_RULE_ID_START)).sort((a, b) => b - a)

    // adjust offset based on rules already created
    dynamicRuleOffset = typeof offsetsAssigned[0] === 'number' ? offsetsAssigned[0] + 1 : 0
    browserWrapper.setToSessionStorage(DYNAMIC_RULE_STORAGE_KEY, dynamicRuleOffset)
})()

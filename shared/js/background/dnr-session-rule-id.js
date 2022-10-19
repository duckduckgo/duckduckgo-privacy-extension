/**
 * For managing dynamically created MV3 session rules
 * getNextSessionRuleId will return the next unique session rule id to use when creating new session rules
 **/
const browserWrapper = require('./wrapper.es6')
const SESSION_RULE_ID_START = 100000
const SESSION_RULE_STORAGE_KEY = 'sessionRuleOffset'
let sessionRuleOffset = 0

export async function getNextSessionRuleId () {
    // if we don't have an offset check existing rules already out (if any) 
    if (!sessionRuleOffset) {
        sessionRuleOffset = await updateOffsetFromExistingRules()
    }

    const nextRuleId = SESSION_RULE_ID_START + sessionRuleOffset
    sessionRuleOffset += 1
    browserWrapper.setToSessionStorage(SESSION_RULE_STORAGE_KEY, sessionRuleOffset)
    return nextRuleId
}

// set offset and update based on rules that have been created
async function updateOffsetFromExistingRules () {
    let currentSessionRuleOffset = await browserWrapper.getFromSessionStorage(SESSION_RULE_STORAGE_KEY) || 0
    
    // if the rule offset is undef or zero let's check existing rules to see if it needs to be updated
    if (!currentSessionRuleOffset) {

        // get any session rules that have been created
        const currentSessionRules = await chrome.declarativeNetRequest.getSessionRules()

        if (currentSessionRules) {
            // get offsets for session rules already created
            const offsetsAssigned = currentSessionRules.map(r => (r.id - SESSION_RULE_ID_START)).sort((a, b) => b - a)

            // adjust offset based on rules already created
            let newSessionRuleOffset = typeof offsetsAssigned[0] === 'number' ? offsetsAssigned[0] + 1 : 0

            if (newSessionRuleOffset) {
                currentSessionRuleOffset = newSessionRuleOffset
                browserWrapper.setToSessionStorage(SESSION_RULE_STORAGE_KEY, newSessionRuleOffset)
            }
        }
    }

    return currentSessionRuleOffset
}

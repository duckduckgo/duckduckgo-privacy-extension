/**
 * For managing dynamically created MV3 session rules
 * getNextSessionRuleId will return the next unique session rule id to use when creating new session rules
 **/
const browserWrapper = require('./wrapper.es6')
const SESSION_RULE_ID_START = 100000
const SESSION_RULE_STORAGE_KEY = 'sessionRuleOffset'
let sessionRuleOffset = 0

export async function setSessionRuleOffsetFromStorage () {
    const offset = await browserWrapper.getFromSessionStorage(SESSION_RULE_STORAGE_KEY)
    if (offset) {
        sessionRuleOffset = offset
    }
}

export function getNextSessionRuleId () {
    const nextRuleId = SESSION_RULE_ID_START + sessionRuleOffset
    sessionRuleOffset += 1
    browserWrapper.setToSessionStorage(SESSION_RULE_STORAGE_KEY, sessionRuleOffset)
    return nextRuleId
}

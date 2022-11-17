/**
 * For managing dynamically created MV3 session rules
 * getNextSessionRuleId will return the next unique session rule id to use when creating new session rules
 **/
import * as browserWrapper from './wrapper.es6'
const SESSION_RULE_ID_START = 100000
const SESSION_RULE_STORAGE_KEY = 'sessionRuleOffset'
let sessionRuleOffset = 0
let ready = false

export async function setSessionRuleOffsetFromStorage () {
    const offset = await browserWrapper.getFromSessionStorage(SESSION_RULE_STORAGE_KEY)
    if (offset) {
        sessionRuleOffset = offset
    }
    ready = true
}

/**
 * Get the next unique session rule id to use when creating session DNR rules
 * @returns {number | null} nextRuleId
 */
export function getNextSessionRuleId () {
    if (!ready) {
        console.warn('Tried to get session rule id before reading offset from storage')
        return null
    }

    const nextRuleId = SESSION_RULE_ID_START + sessionRuleOffset
    sessionRuleOffset += 1
    browserWrapper.setToSessionStorage(SESSION_RULE_STORAGE_KEY, sessionRuleOffset)
    return nextRuleId
}

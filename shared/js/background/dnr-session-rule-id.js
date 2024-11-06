/**
 * For managing dynamically created MV3 session rules
 * getNextSessionRuleId will return the next unique session rule id to use when creating new session rules
 **/
import { getFromSessionStorage, setToSessionStorage } from './wrapper';
const SESSION_RULE_ID_START = 100000;
const SESSION_RULE_STORAGE_KEY = 'sessionRuleOffset';
let sessionRuleOffset = 0;
let ready = false;

export async function setSessionRuleOffsetFromStorage() {
    const offset = await getFromSessionStorage(SESSION_RULE_STORAGE_KEY);
    if (offset) {
        sessionRuleOffset = offset;
    }
    ready = true;
}

/**
 * Get the next unique session rule id to use when creating session DNR rules
 * @returns {number | null} nextRuleId
 */
export function getNextSessionRuleId() {
    if (!ready) {
        console.warn('Tried to get session rule id before reading offset from storage');
        return null;
    }

    const nextRuleId = SESSION_RULE_ID_START + sessionRuleOffset;
    sessionRuleOffset += 1;
    setToSessionStorage(SESSION_RULE_STORAGE_KEY, sessionRuleOffset);
    return nextRuleId;
}

function isValidSessionId(id) {
    return id >= SESSION_RULE_ID_START;
}

/**
 * Remove orphaned session ids
 * We increment the rule IDs for some session rules, starting at STARTING_RULE_ID and
 * keep a note of the next rule ID in session storage. During extesion update/restarts
 * session storage is cleared, while session rules are not, which causes errors due to
 * session rule ID conflicts
 * @return {Promise}
 */
export function flushSessionRules() {
    return chrome.declarativeNetRequest.getSessionRules().then((rules) => {
        const ruleIds = rules.map(({ id }) => id).filter(isValidSessionId);
        if (ruleIds.length) {
            return chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
        }
    });
}

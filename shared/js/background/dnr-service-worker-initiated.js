import {
    SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID
} from './dnr-utils'
import {
    SERVICE_WORKER_INITIATED_ALLOWING_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'
import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'

/**
 * Ensure that the allowing rule for ServiceWorker initiated requests is
 * enabled. Since the rule needs to be restricted to matching requests not
 * associated with a tab (tabId of -1) and so must be a session rule. Session
 * rules don't persist past a browsing session, so must be re-added.
 * Note: Only exported for use by unit tests, do not call manually.
 * @param {Object} config The privacy configuration
 * @return {Promise}
 */
export async function ensureServiceWorkerInitiatedRequestExceptions (config) {
    const removeRuleIds = [SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID]
    const addRules = []

    if (config.features.serviceworkerInitiatedRequests?.state !== 'enabled') {
        // All ServiceWorker initiated request blocking is disabled.
        addRules.push(generateDNRRule({
            id: SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID,
            priority: SERVICE_WORKER_INITIATED_ALLOWING_PRIORITY,
            actionType: 'allow',
            tabIds: [-1]
        }))
    } else if (config.features.serviceworkerInitiatedRequests?.exceptions?.length) {
        // ServiceWorker initiated request blocking is disabled for some domains.
        const exceptionDomains = config.features.serviceworkerInitiatedRequests.exceptions.map(entry => entry.domain)
        addRules.push(generateDNRRule({
            id: SERVICE_WORKER_INITIATED_ALLOWING_RULE_ID,
            priority: SERVICE_WORKER_INITIATED_ALLOWING_PRIORITY,
            actionType: 'allow',
            tabIds: [-1],
            initiatorDomains: exceptionDomains
        }))
    }

    // Rather than check if the rule already exists before adding it, add it and
    // just clear the existing rule if it exists.
    // Note: This might need to be adjusted in the future if there is a
    //       performance impact, on the other hand, checking for the rule first
    //       might cause a race-condition, where ServiceWorker requests are
    //       blocked before the rule is added.
    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds, addRules
    })
}

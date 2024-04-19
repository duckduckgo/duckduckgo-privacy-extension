/** @module gpc */
const {
    resourceTypes,
    generateDNRRule
} = require('./utils')

const GPC_HEADER_PRIORITY = 40000

/**
 * Generate a declarativeNetRequest rule to add Global Privacy Control (GPC)
 * request headers.
 * @param {number} ruleId
 * @param {string[]=} allowedDomains
 *   Request domains not to add the header for. Note this also applies to
 *   initiator domains.
 * @return {import('@duckduckgo/ddg2dnr/lib/utils.js').DNRRule}
 */
function generateGPCheaderRule (ruleId, allowedDomains) {
    return generateDNRRule({
        id: ruleId,
        priority: GPC_HEADER_PRIORITY,
        actionType: 'modifyHeaders',
        requestHeaders: [
            { header: 'Sec-GPC', operation: 'set', value: '1' }
        ],
        resourceTypes: [...resourceTypes],
        excludedInitiatorDomains: allowedDomains,
        excludedRequestDomains: allowedDomains
    })
}

exports.GPC_HEADER_PRIORITY = GPC_HEADER_PRIORITY
exports.generateGPCheaderRule = generateGPCheaderRule

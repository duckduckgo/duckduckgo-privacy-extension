/** @module gpc */
const {
    resourceTypes,
    generateDNRRule
} = require('./utils')

const GPC_HEADER_PRIORITY = 40000

function generateGPCheaderRules (config) {
    if (config.features?.gpc?.state !== 'enabled') {
        return []
    }

    const allowedDomains = config.features.gpc.exceptions?.map(e => e.domain)

    // const rule = Object.assign({}, baseHeaderRule)
    const rule = generateDNRRule({
        priority: GPC_HEADER_PRIORITY,
        actionType: 'modifyHeaders',
        requestHeaders: [
            { header: 'Sec-GPC', operation: 'set', value: '1' }
        ],
        resourceTypes: [...resourceTypes],
        excludedInitiatorDomains: allowedDomains,
        excludedRequestDomains: allowedDomains
    })

    return [{ matchDetails: { type: 'gpc' }, rule }]
}

exports.GPC_HEADER_PRIORITY = GPC_HEADER_PRIORITY
exports.generateGPCheaderRules = generateGPCheaderRules

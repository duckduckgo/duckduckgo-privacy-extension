/** @module trackingParams */
const {
    generateDNRRule
} = require('./utils')

const TRACKING_PARAM_PRIORITY = 40000

function generateTrackingParameterRules (config) {
    if (config.features?.trackingParameters?.state !== 'enabled') {
        return []
    }

    const allowedDomains = config.features.trackingParameters.exceptions?.map(e => e.domain)

    // Skip any wildcard or regex parameters, we can't support these in MV3
    const trackingParams = config.features.trackingParameters.settings?.parameters?.filter(param => !(param.match(/[*+?{}[\]]/, 'g')))

    if (!trackingParams) {
        return []
    }

    const rule = generateDNRRule({
        priority: TRACKING_PARAM_PRIORITY,
        actionType: 'redirect',
        redirect: {
            transform: {
                queryTransform: {
                    removeParams: trackingParams
                }
            }
        },
        resourceTypes: ['main_frame'],
        excludedRequestDomains: allowedDomains
    })

    return [{ matchDetails: { type: 'trackingParams' }, rule }]
}

exports.TRACKING_PARAM_PRIORITY = TRACKING_PARAM_PRIORITY
exports.generateTrackingParameterRules = generateTrackingParameterRules

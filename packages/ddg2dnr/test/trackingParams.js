const assert = require('assert')

const {
    generateTrackingParameterRules,
    TRACKING_PARAM_PRIORITY
} = require('../lib/trackingParams')

const baseExtensionConfig = {
    features: {
        trackingParameters: {
            state: 'enabled',
            settings: {
                parameters: [
                    'dontUseRegexParams*',
                    'trackingParam1',
                    'trackingParam2'
                ]
            },
            exceptions: [{
                domain: 'exception1.example',
                reason: '1st tracking params reason'
            }, {
                domain: 'exception2.example',
                reason: '2nd tracking param reason'
            }]
        }
    }
}

const expectedTrackingParamResult = [{
    matchDetails: { type: 'trackingParams' },
    rule: {
        priority: TRACKING_PARAM_PRIORITY,
        action: {
            type: 'redirect',
            redirect: {
                transform: {
                    queryTransform: {
                        removeParams: ['trackingParam1', 'trackingParam2']
                    }
                }
            }
        },
        condition: {
            resourceTypes: ['main_frame'],
            excludedRequestDomains: [
                'exception1.example',
                'exception2.example'
            ]
        }
    }
}]

describe('Remove Tracking Parameter Rule', () => {
    it('should generate tracking param rule correctly', async () => {
        const trackingParamRule = generateTrackingParameterRules(baseExtensionConfig)
        assert.deepEqual(trackingParamRule, expectedTrackingParamResult)
    })

    it('shouldn\'t generate rules if disabled', async () => {
        const disabledConfig = baseExtensionConfig
        disabledConfig.features.trackingParameters.state = 'disabled'
        const trackingParamRule = generateTrackingParameterRules(baseExtensionConfig)
        assert.deepEqual(trackingParamRule, [])
    })
})

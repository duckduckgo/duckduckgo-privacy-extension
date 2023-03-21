const assert = require('assert')

const {
    generateGPCheaderRules,
    GPC_HEADER_PRIORITY
} = require('../lib/gpc')

const baseExtensionConfig = {
    features: {
        gpc: {
            state: 'enabled',
            exceptions: [{
                domain: 'exception1.example',
                reason: '1st GPC header reason'
            }, {
                domain: 'exception2.example',
                reason: '2nd GPC header reason'
            }]
        }
    }
}

const expectedGPCResult = [{
    matchDetails: { type: 'gpc' },
    rule: {
        priority: GPC_HEADER_PRIORITY,
        action: {
            type: 'modifyHeaders',
            requestHeaders: [
                { header: 'Sec-GPC', operation: 'set', value: '1' }
            ]
        },
        condition: {
            resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'webtransport', 'webbundle', 'other'],
            excludedInitiatorDomains: [
                'exception1.example',
                'exception2.example'
            ],
            excludedRequestDomains: [
                'exception1.example',
                'exception2.example'
            ]
        }
    }
}]

describe('GPC Header rule', () => {
    it('should generate GPC header rule  correctly', async () => {
        const gpcRule = generateGPCheaderRules(baseExtensionConfig)
        assert.deepEqual(gpcRule, expectedGPCResult)
    })

    it('shouldn\'t generate contentBlocking rules if disabled', async () => {
        const disabledConfig = baseExtensionConfig
        disabledConfig.features.gpc.state = 'disabled'
        const gpcRule = generateGPCheaderRules(baseExtensionConfig)
        assert.deepEqual(gpcRule, [])
    })
})

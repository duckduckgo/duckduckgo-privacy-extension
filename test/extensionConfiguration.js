const assert = require('assert')

const {
    generateExtensionConfigurationRuleset
} = require('../lib/extensionConfiguration')

describe('generateExtensionConfigurationRuleset', () => {
    it('should reject invalid extension configuration', async () => {
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset(null, () => { })
        )
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset({}, () => { })
        )
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset({
                features: null
            }, () => { })
        )
        await assert.doesNotReject(() =>
            generateExtensionConfigurationRuleset({
                features: {}
            }, () => { })
        )
    })

    it('should notice missing isRegexSupported argument', async () => {
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset({
                features: {}
            })
        )
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset({
                features: {}
            }, 3)
        )
        await assert.doesNotReject(() =>
            generateExtensionConfigurationRuleset({
                features: {}
            }, () => { })
        )
    })
})

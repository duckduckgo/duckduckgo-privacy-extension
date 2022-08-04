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
})

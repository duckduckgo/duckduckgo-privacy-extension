const assert = require('assert')

const {
    generateExtensionConfigurationRuleset
} = require('../lib/extensionConfiguration')

describe('generateExtensionConfigurationRuleset', () => {
    it('should reject invalid extension configuration', () => {
        assert.rejects(() =>
            generateExtensionConfigurationRuleset(null)
        )
        assert.rejects(() =>
            generateExtensionConfigurationRuleset({})
        )
        assert.rejects(() =>
            generateExtensionConfigurationRuleset({
                features: null
            })
        )
    })
})

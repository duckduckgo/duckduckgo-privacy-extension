const assert = require('assert');

const { generateExtensionConfigurationRuleset } = require('../lib/extensionConfiguration');

describe('generateExtensionConfigurationRuleset', () => {
    it('should reject invalid extension configuration', async () => {
        // @ts-expect-error - Invalid configuration on purpose.
        await assert.rejects(() => generateExtensionConfigurationRuleset(null, [], () => {}));
        // @ts-expect-error - Invalid configuration on purpose.
        await assert.rejects(() => generateExtensionConfigurationRuleset({}, [], () => {}));
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset(
                {
                    // @ts-expect-error - Invalid configuration on purpose.
                    features: null,
                },
                [],
                () => {},
            ),
        );
        await assert.doesNotReject(() =>
            generateExtensionConfigurationRuleset(
                // @ts-expect-error - Incomplete configuration on purpose.
                {
                    features: {},
                },
                [],
                () => {},
            ),
        );
    });

    it('should notice missing isRegexSupported argument', async () => {
        await assert.rejects(() =>
            // @ts-expect-error - Missing isRegexSupported argument.
            generateExtensionConfigurationRuleset(
                {
                    features: {},
                },
                [],
            ),
        );
        await assert.rejects(() =>
            generateExtensionConfigurationRuleset(
                /** @type {any} */ ({ features: {} }),
                [],
                // @ts-expect-error - Invalid isRegexSupported argument.
                3,
            ),
        );
        await assert.doesNotReject(() =>
            generateExtensionConfigurationRuleset(
                // @ts-expect-error - Incomplete configuration on purpose.
                {
                    features: {},
                },
                [],
                () => {},
            ),
        );
    });
});

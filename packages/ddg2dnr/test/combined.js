const assert = require('assert')

const { emptyBlockList } = require('./utils/helpers')
const { generateCombinedConfigBlocklistRuleset } = require('../lib/combined')

describe('generateCombinedConfigBlocklistRuleset', () => {
    it('should reject invalid extension configuration', () => {
        assert.throws(() => {
            generateCombinedConfigBlocklistRuleset(
                emptyBlockList(),
                // @ts-expect-error - Arguments invalid on purpose.
                null,
                [],
            )
        })

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                emptyBlockList(),
                // @ts-expect-error - Arguments invalid on purpose.
                { features: null },
                [],
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        )

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                emptyBlockList(),
                // @ts-expect-error - Arguments invalid on purpose.
                {},
                [],
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        )

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                emptyBlockList(),
                // @ts-expect-error - Arguments invalid on purpose.
                { features: {} },
                [],
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        )

        assert.deepEqual(generateCombinedConfigBlocklistRuleset(emptyBlockList(), { features: {}, unprotectedTemporary: [] }, []), {
            ruleset: [],
            matchDetailsByRuleId: {},
        })
    })
})

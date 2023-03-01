const assert = require('assert')

const {
    emptyBlockList
} = require('./utils/helpers')
const {
    generateCombinedConfigBlocklistRuleset
} = require('../lib/combined')

describe('generateCombinedConfigBlocklistRuleset', () => {
    it('should reject invalid extension configuration', () => {
        assert.throws(() => {
            generateCombinedConfigBlocklistRuleset(
                // @ts-expect-error - Arguments invalid on purpose.
                emptyBlockList(), null, []
            )
        })

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                // @ts-expect-error - Arguments invalid on purpose.
                emptyBlockList(), { features: null }, []
            ),
            { ruleset: [], matchDetailsByRuleId: { } }
        )

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                // @ts-expect-error - Arguments invalid on purpose.
                emptyBlockList(), {}, []
            ),
            { ruleset: [], matchDetailsByRuleId: { } }
        )

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                // @ts-expect-error - Arguments invalid on purpose.
                emptyBlockList(), { features: { } }, []
            ),
            { ruleset: [], matchDetailsByRuleId: { } }
        )

        assert.deepEqual(
            generateCombinedConfigBlocklistRuleset(
                emptyBlockList(), { features: { }, unprotectedTemporary: [] }, []
            ),
            { ruleset: [], matchDetailsByRuleId: { } }
        )
    })
})

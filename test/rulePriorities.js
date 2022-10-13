const assert = require('assert')

const {
    SMARTER_ENCRYPTION_PRIORITY
} = require('../lib/smarterEncryption')

const {
    BASELINE_PRIORITY: TRACKER_BLOCKING_BASELINE_PRIORITY,
    CEILING_PRIORITY: TRACKER_BLOCKING_CEILING_PRIORITY
} = require('../lib/tds')

const {
    BASELINE_PRIORITY: TRACKER_ALLOWLIST_BASELINE_PRIORITY,
    CEILING_PRIORITY: TRACKER_ALLOWLIST_CEILING_PRIORITY
} = require('../lib/trackerAllowlist')

const {
    AD_ATTRIBUTION_POLICY_PRIORITY,
    USER_ALLOWLISTED_PRIORITY
} = require('../lib/rulePriorities')

describe('Rule Priorities', () => {
    it('correct relative rule priorities', () => {
        // Tracker Blocking priorities.
        assert.ok(TRACKER_BLOCKING_BASELINE_PRIORITY > 0)
        assert.ok(TRACKER_BLOCKING_CEILING_PRIORITY >
                  TRACKER_BLOCKING_BASELINE_PRIORITY)

        // Tracker Allowlist priorities.
        assert.ok(TRACKER_ALLOWLIST_BASELINE_PRIORITY >
                  TRACKER_BLOCKING_CEILING_PRIORITY)

        // Extension state rule priorities.
        assert.ok(AD_ATTRIBUTION_POLICY_PRIORITY >
                 TRACKER_BLOCKING_CEILING_PRIORITY)

        // Smarter Encryption priority.
        // Note: It's important that the Smarter Encryption rule priority is
        //       higher than the priority for Tracker Blocking etc rules.
        //       After a request is redirected to use HTTPS, the redirected
        //       request will still match against other block/allow rules. But
        //       after an allow rules matches a request, upgrade schema rules
        //       will no longer have the opportunity to match.
        assert.ok(SMARTER_ENCRYPTION_PRIORITY >
                  TRACKER_ALLOWLIST_CEILING_PRIORITY)
        assert.ok(SMARTER_ENCRYPTION_PRIORITY >
                 AD_ATTRIBUTION_POLICY_PRIORITY)

        // If the user disables protections for a website, that should take
        // precedence over everything else.
        assert.ok(USER_ALLOWLISTED_PRIORITY > SMARTER_ENCRYPTION_PRIORITY)
    })
})

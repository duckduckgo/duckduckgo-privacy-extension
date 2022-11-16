const assert = require('assert')

const {
    SMARTER_ENCRYPTION_PRIORITY
} = require('../lib/smarterEncryption')

const {
    GPC_HEADER_PRIORITY
} = require('../lib/gpc')

const {
    BASELINE_PRIORITY: TRACKER_BLOCKING_BASELINE_PRIORITY,
    CEILING_PRIORITY: TRACKER_BLOCKING_CEILING_PRIORITY
} = require('../lib/tds')

const {
    BASELINE_PRIORITY: TRACKER_ALLOWLIST_BASELINE_PRIORITY,
    CEILING_PRIORITY: TRACKER_ALLOWLIST_CEILING_PRIORITY
} = require('../lib/trackerAllowlist')

const {
    CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
    UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY
} = require('../lib/temporaryAllowlist')

const {
    AD_ATTRIBUTION_POLICY_PRIORITY,
    USER_ALLOWLISTED_PRIORITY
} = require('../lib/rulePriorities')

describe('Rule Priorities', () => {
    it('correct relative rule priorities', () => {
        assert.ok(GPC_HEADER_PRIORITY >
                  TRACKER_BLOCKING_CEILING_PRIORITY)

        // Tracker Blocking priorities.
        assert.ok(TRACKER_BLOCKING_BASELINE_PRIORITY > 0)
        assert.ok(TRACKER_BLOCKING_CEILING_PRIORITY >
                  TRACKER_BLOCKING_BASELINE_PRIORITY)

        // Tracker Allowlist priorities.
        assert.ok(TRACKER_ALLOWLIST_BASELINE_PRIORITY >
                  TRACKER_BLOCKING_CEILING_PRIORITY)

        // Content Blocking allowlist and ad attribution allowlisting rules
        // should disable Tracker Blocking, but not other protections.
        assert.ok(CONTENT_BLOCKING_ALLOWLIST_PRIORITY >
                  TRACKER_BLOCKING_CEILING_PRIORITY)
        assert.ok(AD_ATTRIBUTION_POLICY_PRIORITY ===
                  CONTENT_BLOCKING_ALLOWLIST_PRIORITY)

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
        assert.ok(SMARTER_ENCRYPTION_PRIORITY >
                  CONTENT_BLOCKING_ALLOWLIST_PRIORITY)

        // Unprotected Temporary allowlist and user allowlist should disable all
        // protections.
        assert.ok(UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY >
                  TRACKER_BLOCKING_CEILING_PRIORITY)
        assert.ok(UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY >
                  SMARTER_ENCRYPTION_PRIORITY)
        assert.ok(USER_ALLOWLISTED_PRIORITY ===
                  UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY)
        assert.ok(USER_ALLOWLISTED_PRIORITY >
                  GPC_HEADER_PRIORITY)
    })
})

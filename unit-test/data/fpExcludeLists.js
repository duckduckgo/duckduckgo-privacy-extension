/*
 * Create test safe lists for various fingerprint exclusions here
 */

const ReferrerTestList = {
    excludedReferrers: [
        {
            domain: 'test.com',
            reason: 'testing'
        },
        {
            domain: 'testing.com',
            reason: 'testing'
        }
    ]
};

module.exports = {
    referrer: ReferrerTestList
};

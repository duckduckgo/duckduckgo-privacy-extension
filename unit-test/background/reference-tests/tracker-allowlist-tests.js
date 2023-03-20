const tdsStorageStub = require('../../helpers/tds')
const tds = require('../../../shared/js/background/trackers')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const refTests = require('@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_matching_tests.json')
const allowList = require('../../../shared/js/background/allowlisted-trackers')
const config = require('../../../shared/data/bundled/extension-config.json')

describe('Tracker allowlist tests:', () => {
    beforeAll(() => {
        config.features.trackerAllowlist = {
            state: 'enabled',
            settings: {
                allowlistedTrackers: require('@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_reference.json')
            }
        }

        tdsStorageStub.stub({ config })

        return tdsStorage.getLists()
            .then(lists => tds.setLists(lists))
    })

    refTests.forEach(test => {
        it(`${test.description}`, () => {
            const result = allowList(test.site, test.request)

            expect(test.isAllowlisted).toEqual(!!result)
        })
    })
})

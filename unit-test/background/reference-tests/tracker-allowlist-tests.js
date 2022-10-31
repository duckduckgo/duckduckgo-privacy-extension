import tds from '../../../shared/js/background/trackers'
import allowList from '../../../shared/js/background/allowlisted-trackers'
import tdsStorage from '../../../shared/js/background/storage/tds'
const tdsStorageStub = require('../../helpers/tds.es6')

const refTests = require('../../data/reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_matching_tests.json')
const config = require('../../../shared/data/bundled/extension-config.json')

describe('Tracker allowlist tests:', () => {
    beforeAll(() => {
        config.features.trackerAllowlist = {
            state: 'enabled',
            settings: {
                allowlistedTrackers: require('../../data/reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_reference.json')
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

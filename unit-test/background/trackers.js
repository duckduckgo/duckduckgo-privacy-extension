const tdsTests = require('./../data/tdsTestDomains.json')
const tds = require('../../shared/js/background/trackers')
const tdsStorage = require('../../shared/js/background/storage/tds').default
const tdsStorageStub = require('./../helpers/tds')

describe('tracker blocking', () => {
    beforeEach(() => {
        tdsStorageStub.stub()
        return tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    it('tracker module has correct data', () => {
        expect(!!Object.keys(tds.entityList).length).toBe(true)
        expect(!!Object.keys(tds.trackerList).length).toBe(true)
        expect(!!Object.keys(tds.domains).length).toBe(true)
        expect(!!Object.keys(tds.surrogateList).length).toBe(true)
    })

    it('test blocking result data', () => {
        tdsTests.forEach(test => {
            const result = tds.getTrackerData(test.tracker, test.site, test.req)
            expect(result.action).toBe(test.result.action)
            expect(result.reason).toBe(test.result.reason)
            expect(result.sameEntity).toBe(test.result.sameEntity)
        })
    })
})

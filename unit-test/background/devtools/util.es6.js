require('../../helpers/mock-browser-api')
const tds = require('../../../shared/js/background/trackers.es6')
const util = require('./../../../shared/js/devtools/util.es6.js')

function getTrackerData (path) {
    return tds.getTrackerData(`https://${path}`, 'test-site.com', {type: 'script'})
}

function initTds (trackers) {
    const tdsData = { entities: {}, domains: {}, cnames: {}, trackers }
    tds.setLists([{name: 'tds', data: {
        entities: {}, domains: {}, cnames: {}, trackers
    }}])
}

function blockRequest(request) {
    util.blockRequest(tds, request)
}

describe('blockRequest:', () => {
    const tracker1Dom = 'tracker1.com'
    const tracker1Path1 = `${tracker1Dom}/simple/request.js`

    describe('tracker with default ignore no rules:', () => {
        const trackerDomain = tracker1Dom
        const trackerPath = tracker1Path1
        const trackerPath2 = `${trackerDomain}/simple/anotherPath.js`

        beforeEach(() => {
            initTds({
                "tracker1.com": {
                    default: "ignore",
                    rules: []
                }
            })
        })

        it('should have request in block', () => {
            blockRequest(trackerPath)
            expect(getTrackerData(trackerPath).action).toEqual('block')
        })

        it('should block request', () => {
            blockRequest(trackerPath)
            expect(tds.trackerList[trackerDomain].rules).toEqual([{rule: trackerPath}])
        })

        it('should retain default ignore', () => {
            blockRequest(tracker1Path1)
            expect(tds.trackerList[trackerDomain].default).toEqual('ignore')
        })

        it('block request should be idempotent', () => {
            blockRequest(trackerPath)
            blockRequest(trackerPath)
            expect(tds.trackerList[trackerDomain].rules).toEqual([{rule: trackerPath}])
        })

        it('block with multiple requests', () => {
            blockRequest(trackerPath)
            blockRequest(trackerPath2)
            expect(tds.trackerList[trackerDomain].rules).toEqual([{rule: trackerPath}, {rule: trackerPath2}])
        })
    })

    describe('tracker with default block no rules:', () => {
        beforeEach(() => {
            initTds({
                'tracker1.com': {
                    default: 'block'
                }
            })
        })
        it('adds no rules', () => {
            blockRequest('tracker1.com/simple/request.js')
            expect(tds.trackerList['tracker1.com'].rules).toEqual([])
        })
        it('retains default block', () => {
            blockRequest('tracker1.com/simple/request.js')
            expect(tds.trackerList['tracker1.com'].default).toEqual('block')
        })
    })

    describe('tracker with default block and exception:', () => {
        const tracker2GeneralPath = 'tracker2.com/more/general'
        beforeEach(() => {
            const trackers = {
                'tracker1.com': {
                    default: 'block',
                    rules: [{ rule: tracker1Path1, action: 'ignore' }]
                },
                'tracker2.com': {
                    default: 'block',
                    rules: [{ rule: `${tracker2GeneralPath}/.*`, action: 'ignore' }]
                }
            }
            initTds(trackers)
        })

        it('does not bock before, blocks after', () => {
            const result1 = getTrackerData(tracker1Path1)
            expect(result1.action).toEqual('ignore')
            blockRequest(tracker1Path1)
            const result2 = getTrackerData(tracker1Path1)
            expect(result2.action).toEqual('block')
        })

        describe('with ignore more general than rule:', () => {
            it('retains ignore on the path', () => {
                blockRequest(`${tracker2GeneralPath}/script.js`)
                expect(getTrackerData(`${tracker2GeneralPath}/otherScript.js`).action).toEqual('ignore')
            })
            it('blocks the request', () => {
                blockRequest(`${tracker2GeneralPath}/script.js`)
                expect(getTrackerData(`${tracker2GeneralPath}/script.js`).action).toEqual('block')
            })
        })
    })

    describe('blocking subdomain request:', () => {
        const req = 'sub.tracker1.com/request.js'
        beforeEach(() => {
            initTds({
                'tracker1.com': {
                    default: 'ignore'
                }
            })
        })
        it('does not add a new tracker', () => {
            blockRequest(req)
            expect(Object.keys(tds.trackerList)).toEqual(['tracker1.com'])
        })
        it('adds the request to the correct tracker', () => {
            blockRequest(req)
            expect(tds.trackerList['tracker1.com'].rules).toEqual([{rule: req}])
        })
    })

    describe('when tracker is not present:', () => {
        const tracker2Dom = 'tracker2.com'
        const tracker2SubDom = `sub.${tracker2Dom}`
        const tracker2Request = `${tracker2SubDom}/simple/request.js`
        beforeEach(() => {
            initTds({})
        })

        it('adds tracker domain to tds', () => {
            blockRequest(tracker1Path1)
            expect(Object.keys(tds.trackerList)).toContain(tracker1Dom)
        })

        describe('request with subdomain:', () => {
            it('adds base domain to tds', () => {
                blockRequest(tracker2Request)
                expect(Object.keys(tds.trackerList)).toContain(tracker2Dom)
            })

            it('adds request with subdomain', () => {
                blockRequest(tracker2Request)
                expect(tds.trackerList[tracker2Dom].rules).toEqual([{rule: tracker2Request}])
            })
        })
    })
})

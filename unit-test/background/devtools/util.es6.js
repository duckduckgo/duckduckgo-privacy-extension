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

function expectBlock (request) {
    expect(getTrackerData(request).action).toEqual('block')
}

function expectIgnore (request) {
    expect(getTrackerData(request).action).toEqual('ignore')
}

/**
 * Return a basic deep clone of the value. Does not support all types of value.
 *
 * Some values may be deep cloned, others may be shallow.
 */
function cloneBasic(e) {
    if (typeof e === 'object') {
        if (Array.isArray(e)) {
            return e.map(cloneBasic)
        }
        if (e instanceof RegExp) {
            return new RegExp(e)
        }
        return Object.fromEntries(Object.entries(e).map(kv => [kv[0], cloneBasic(kv[1])]))
    }
    return e
}

/**
 * Run two executions and expect the resulting TDS trackers to be the same for each afterwards.
 */
function compareTrackerLists (f1, f2) {
    const trackersCopy1 = cloneBasic(tds.trackerList)
    const trackersCopy2 = cloneBasic(tds.trackerList)
    initTds(trackersCopy1)
    f1()
    const f1Trackers = tds.trackerList
    initTds(trackersCopy2)
    f2()
    const f2Trackers = tds.trackerList
    expect(f1Trackers).toEqual(f2Trackers)
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

        it('should block request', () => {
            blockRequest(trackerPath)
            expectBlock(trackerPath)
        })

        it('gives the correct trackers shape', () => {
            blockRequest(trackerPath)
            const trackers = cloneBasic(tds.trackerList)
            // here we are checking that re-initialising the trackers with the trackers _after_ a block
            // does not require the trackers to be changed at all - i.e., that blockRequest sets trackers
            // to be the exact correct trackers required
            initTds(cloneBasic(tds.trackerList))
            expect(tds.trackerList).toEqual(trackers)
        })

        it('should retain default ignore', () => {
            blockRequest(tracker1Path1)
            expect(tds.trackerList[trackerDomain].default).toEqual('ignore')
        })

        it('should not block other requests', () => {
            blockRequest(trackerPath)
            expectIgnore(trackerPath2)
        })

        it('should not block longer request path (on right)', () => {
            blockRequest(trackerPath)
            expectIgnore(`${trackerPath}.`)
        })

        it('block request should be idempotent', () => {
            compareTrackerLists(() => {
                blockRequest(trackerPath)
            }, () => {
                blockRequest(trackerPath)
                blockRequest(trackerPath)
            })
        })

        describe('blocking different requests same domain', () => {
            beforeEach(() => {
                blockRequest(trackerPath)
                blockRequest(trackerPath2)
            })
            it('retains ignore on unrelated requests', () => {
                expectIgnore('tracker1.com/other/path.js')
            })
            it('blocks on first request', () => {
                expectBlock(trackerPath)
            })
            it('blocks on second request', () => {
                expectBlock(trackerPath2)
            })
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
                expectIgnore(`${tracker2GeneralPath}/otherScript.js`)
            })
            it('blocks the request', () => {
                blockRequest(`${tracker2GeneralPath}/script.js`)
                expectBlock(`${tracker2GeneralPath}/script.js`)
            })
            it('does not block request path longer on right', () => {
                blockRequest(`${tracker2GeneralPath}/script.js`)
                expectIgnore(`${tracker2GeneralPath}/script.js.`)
            })
            it('gives the correct trackers shape', () => {
                blockRequest(`${tracker2GeneralPath}/script.js`)
                const trackers = cloneBasic(tds.trackerList)
                initTds(cloneBasic(tds.trackerList))
                expect(tds.trackerList).toEqual(trackers)
            })
        })
    })

    describe('blocking subdomain request:', () => {
        const reqBase = 'tracker1.com/request.js'
        const req = `sub.${reqBase}`
        beforeEach(() => {
            initTds({
                'tracker1.com': {
                    default: 'ignore'
                }
            })
            blockRequest(req)
        })
        it('does not add a new tracker', () => {
            expect(Object.keys(tds.trackerList)).toEqual(['tracker1.com'])
        })
        it('blocks the request', () => {
            expectBlock(req)
        })
        it('does not block other subdomain', () => {
            expectIgnore(`sub2.${reqBase}`)
        })
        it('does not block domain', () => {
            expectIgnore(reqBase)
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
            beforeEach(() => {
                blockRequest(tracker2Request)
            })
            it('adds base domain to tds', () => {
                expect(Object.keys(tds.trackerList)).toContain(tracker2Dom)
            })

            it('blocks the subdomain request', () => {
                expectBlock(tracker2Request)
            })
        })
    })

    describe('resource types:', () => {
        const req = 'tracker.com/simple/request.js'
        beforeEach(() => {
            initTds({
                'tracker.com': {
                    default: 'block',
                    rules: [{
                        rule: req,
                        exceptions: { types: ['script'] }
                    }]
                },
                'tracker2.com': {
                    default: 'block',
                    rules: [{
                        rule: 'tracker2.com/.*/request.js',
                        exceptions: { types: ['script'] }
                    }]
                }
            })
        })

        it('blocks over resource exception', () => {
            blockRequest(req)
            expectBlock(req)
        })

        it('does not block for more general request', () => {
            const req2 = 'tracker2.com/simple/request.js'
            blockRequest(req2)
            expectBlock(req2)
            expectIgnore('tracker2.com/another/request.js')
        })
    })
})

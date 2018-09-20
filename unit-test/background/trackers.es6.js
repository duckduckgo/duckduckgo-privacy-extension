const trackers = require('../../shared/js/background/trackers.es6')
const trackersStorage = require('../../shared/js/background/storage/trackers.es6')
const constants = require('./../../shared/data/constants.js')
const trackersWithParentCompany = require('./../data/trackersWithParentCompany.json')
const entitylist = require('./../data/entitylist.json')
const load = require('./../helpers/load.es6')
const trackerTests = require('./../data/trackertests.json')
const settingHelper = require('../helpers/settings.es6')

function getRequestTab (ops) {
    if (!ops) ops = {}

    if (ops.domain) {
        ops.url = `http://${ops.domain}`
    }

    let request = {type: ops.type || 'script', url: ops.reqUrl || 'https://test.com'}
    let tab = {
        tabId: 1,
        url: ops.url || 'https://test.com',
        site: {domain: ops.domain || 'test.com'}
    }

    return {request: request, tab: tab}
}

// turn a isTracker result to bool
function getBlockBool (block) {
    if (!block) return false

    // block.block is true
    if (block && block.block) {
        return block.block
    }

    // everything else is false
    return false
}

describe('Trackers', () => {
    beforeAll(() => {
        settingHelper.stub({trackerBlockingEnabled: true})

        load.loadStub({trackersWithParentCompany: trackersWithParentCompany, entitylist: entitylist})

        return trackersStorage.getLists(constants.trackersLists)
            .then(lists => {
                return trackers.setLists(lists)
            })
    })

    it('should have entityList', () => {
        expect(!!Object.keys(trackers.entityList).length).toEqual(true)
    })

    it('should have trackersWithParentCompany', () => {
        expect(!!Object.keys(trackers.trackersWithParentCompany).length).toEqual(true)
    })

    it('basic blocking tests', () => {
        trackerTests.basicBlocking.forEach(test => {
            const stubRequestData = getRequestTab({reqUrl: test.url})
            let block = trackers.isTracker(test.url, stubRequestData.tab, stubRequestData.request)
            expect(getBlockBool(block)).toEqual(test.block)
        })
    })

    it('blocking with options', () => {
        trackerTests.blockingWithOptions.forEach(test => {
            const stubRequestData = getRequestTab(Object.assign(test.options, {reqUrl: test.url}))
            let block = trackers.isTracker(test.url, stubRequestData.tab, stubRequestData.request)
            expect(getBlockBool(block)).toEqual(test.block)
            if (test.result) {
                if (test.result.reason) expect(block.reason).toEqual(test.result.reason)
                if (test.result.parentCompany) expect(block.parent).toEqual(test.result.parent)
            }
        })
    })

    /* we can't test this yet. Need to load surrogate data first
    it('surrogate blocking', () => {
        trackerTests.surrogateBlocking.forEach(test => {
            const stubRequestData = getRequestTab({reqUrl: test.url})
            let block = trackers.isTracker(test.url, stubRequestData.tab, stubRequestData.request)
            console.log(block)
            expect(getBlockBool(block)).toEqual(true)
            // check for redirect url too
        })
    })
    */

    // test all trackers that don't have regex rules
    it('block all 3rd party rules', () => {
        Object.entries(trackers.trackersWithParentCompany).forEach(([category, trackerList]) => {
            // only test categories that we're blocking on
            if (constants.blocking.includes(category)) {
                Object.entries(trackerList).forEach(([domain, trackerObj]) => {
                    if (!trackerObj.rules && !trackerObj.whitelist) {
                        const stubRequestData = getRequestTab({reqUrl: `http://${domain}`})
                        let block = trackers.isTracker(domain, stubRequestData.tab, stubRequestData.request)
                        expect(getBlockBool(block)).toEqual(true)
                    }
                })
            }
        })
    })
})

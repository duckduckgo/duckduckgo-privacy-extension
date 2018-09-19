const trackers = require('../../shared/js/background/trackers.es6')
const trackersStorage = require('../../shared/js/background/storage/trackers.es6')
const constants = require('./../../shared/data/constants.js')
const trackersWithParentCompany = require('./../data/trackersWithParentCompany.json')
const entitylist = require('./../data/entitylist.json')
const load = require('./../helpers/load.es6')
const trackerTests = require('./../data/trackertests.json')

const settings = require('../../shared/js/background/settings.es6')
const settingHelper = require('../helpers/settings.es6')

function getRequestTab () {
    let request = {type: 'script', url: 'https://test.com'}
    let tab = {
        tabId: 1,
        url: 'https://test.com',
        site: {domain: 'test.com'}
    }

    return {request: request, tab: tab}
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
            const stubRequestData = getRequestTab()
            let block = trackers.isTracker(test.url, stubRequestData.tab, stubRequestData.request)
            block = block ? true : false
            expect(block).toEqual(test.block)
        })
    })
})

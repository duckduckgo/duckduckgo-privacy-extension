const tds = require('../../shared/js/background/trackers.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
const tdsStorageStub = require('./../helpers/tds.es6')

const { blockHandleResponse } = require('../../shared/js/background/before-request.es6')
const Tab = require('../../shared/js/background/classes/tab.es6')

const testCases = [
    { url: 'https://facebook.net/example/', expectedAction: 'ignore' },
    { url: 'https://facebook.net/tracker', expectedAction: 'block' },
    { url: 'https://facebook.net/script.js', expectedAction: 'redirect' }
]

async function testMatchOutcomes (siteUrl, disabledRuleActions, expectedActions) {
    for (let i = 0; i < testCases.length; i++) {
        const requestData = {
            url: testCases[i].url, type: 'script', tabId: 1, frameId: 1
        }

        const tab = new Tab({ tabId: requestData.tabId, url: siteUrl, status: null })
        tab.disabledClickToLoadRuleActions = disabledRuleActions

        const result = await blockHandleResponse(tab, requestData)
        let actualAction = 'ignore'
        if (result?.cancel === true) {
            actualAction = 'block'
        } else if (result?.redirectUrl) {
            actualAction = 'redirect'
        }
        expect(actualAction).toEqual(expectedActions[i])

        tab.disabledClickToLoadRuleActions = []
    }
}

describe('Click to Load', () => {
    beforeEach(() => {
        tdsStorageStub.stub()
        return tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    it('Applies known Click to Load rule actions', async () => {
        await testMatchOutcomes(
            'https://third-party.example',
            [],
            ['ignore', 'block', 'redirect']
        )
    })

    it('Ignores first-party Click to Load rule actions', async () => {
        await testMatchOutcomes(
            'https://facebook.com',
            [],
            ['ignore', 'ignore', 'ignore']
        )
    })

    it('Ignores disabled Click to Load rule actions', async () => {
        await testMatchOutcomes(
            'https://third-party.example',
            ['block-ctl-fb'],
            ['ignore', 'ignore', 'ignore']
        )
    })
})

const fs = require('fs')
const path = require('path')

const tds = require('../../../shared/js/background/trackers')
const tdsStorage = require('../../../shared/js/background/storage/tds').default
const tdsStorageStub = require('../../helpers/tds')

const configReference =
      require('@duckduckgo/privacy-reference-tests/click-to-load/config_reference.json')
const tdsReference =
      require('@duckduckgo/privacy-reference-tests/click-to-load/tds_reference.json')
const surrogatesReference =
      fs.readFileSync(path.join(
          __dirname, '../../../node_modules/@duckduckgo/privacy-reference-tests/click-to-load/surrogates_reference.txt'
      ), 'utf8')
const { clickToLoadRequestBlocking: { tests } } =
      require('@duckduckgo/privacy-reference-tests/click-to-load/tests.json')

const { blockHandleResponse } = require('../../../shared/js/background/before-request')
const Tab = require('../../../shared/js/background/classes/tab')

async function testMatchOutcome (requestUrl, siteUrl, disabledRuleActions, expectedOutcome) {
    const requestData = {
        url: requestUrl, type: 'script', tabId: 1, frameId: 1
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
    expect(actualAction).toEqual(expectedOutcome)

    tab.disabledClickToLoadRuleActions = []
}

describe('Click to Load', () => {
    beforeAll(() => {
        tdsStorageStub.stub({
            config: configReference,
            surrogates: surrogatesReference,
            tds: tdsReference
        })
        return tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    for (const test of tests) {
        if (test?.exceptPlatforms?.includes('web-extension')) continue

        it(test.name, async () => {
            await testMatchOutcome(
                test.requestUrl,
                test.siteUrl,
                test.userUnblockedRuleActions,
                test.expectedOutcome
            )
        })
    }
})

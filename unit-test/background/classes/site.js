const Site = require('../../../shared/js/background/classes/site')
const browserWrapper = require('../../../shared/js/background/wrapper')
const load = require('./../../helpers/utils')
const config = require('./../../../shared/data/bundled/extension-config.json')
const tdsStorage = require('../../../shared/js/background/storage/tds').default
const tdsStorageStub = require('./../../helpers/tds')

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

describe('Site', () => {
    beforeAll(() => {
        load.loadStub({ config })
        spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
        tdsStorageStub.stub()

        return tdsStorage.getLists()
    })

    describe('getSpecialDomain()', () => {
        const tests = [
            { url: 'https://duckduckgo.com', expected: null },
            { url: 'localhost:3000', expected: 'localhost' },
            { url: '', expected: 'new tab' },
            { url: 'chrome-search://local-ntp/local-ntp.html', expected: 'new tab' },
            { url: 'chrome://extensions', expected: 'extensions' },
            { url: 'chrome://settings', expected: 'settings' },
            { url: 'chrome://newtab', expected: 'new tab' },
            { url: 'chrome://version', expected: 'version' },
            { url: 'vivaldi://version', expected: 'version' },
            { url: 'about:addons', expected: 'addons' },
            { url: 'about:preferences', expected: 'preferences' },
            { url: 'about:preferences#home', expected: 'preferences' },
            { url: 'about:preferences?foo=bar', expected: 'preferences' },
            { url: 'about:url-classifier', expected: 'url-classifier' },
            { url: `chrome-extension://${EXT_ID}/html/options.html`, expected: 'options' },
            { url: `moz-extension://${EXT_ID}/html/options.html`, expected: 'options' },
            { url: `moz-extension://${EXT_ID}/html/feedback.html`, expected: 'feedback' },
            { url: `moz-extension://${EXT_ID}/feedback.html`, expected: 'extension page' },
            { url: 'chrome-extension://asdfasdfasdfasdf/page.html', expected: 'extension page' },
            // vivaldi's start page - not trying to handle that specifically because it may change its ID
            { url: 'chrome-extension://mpognobbkildjkofajifpdfhcoklimli/components/startpage/startpage.html?section=Speed-dials&activeSpeedDialIndex=0', expected: 'extension page' },
            { url: 'file://example', expected: 'local file' },
            { url: 'https://duckduckgo.com/chrome_newtab', expected: 'new tab' },
            { url: 'about:newtab', expected: 'new tab' }
        ]

        tests.forEach((test) => {
            it(`should return "${test.expected}" for: ${test.url}`, () => {
                const site = new Site(test.url)

                expect(site.specialDomainName).toEqual(test.expected)
            })
        })
    })

    describe('checkBrokenSites()', () => {
        const tests = [
            { url: 'https://suntrust.com', expected: true },
            { url: 'https://othersuntrust.com', expected: false },
            { url: 'https://sun.trust.com', expected: false },
            { url: 'https://sun.rust.com', expected: false },
            { url: 'https://sunt.rust.com', expected: false },
            { url: 'https://www1.onlinebanking.suntrust.com', expected: true },
            { url: 'https://nationwide.co.uk', expected: false },
            { url: 'https://accounts.google.com', expected: true }
        ]
        tests.forEach((test) => {
            it(`should return "${test.expected}" for: ${test.url}`, () => {
                const site = new Site(test.url)
                expect(site.isBroken).toEqual(test.expected)
            })
        })
    })
})

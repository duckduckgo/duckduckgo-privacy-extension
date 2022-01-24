require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers.es6')
const tdsStorageStub = require('../../helpers/tds.es6')
const tdsStorage = require('../../../shared/js/background/storage/tds.es6')

// const tabManager = require('../../../shared/js/background/tab-manager.es6')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')
// const getArgumentsObject = require('../../../shared/js/background/helpers/arguments-object')

const batteryProtection = require('../../../shared/content-scope-scripts/src/features/fingerprinting-battery')
const hardwareProtection = require('../../../shared/content-scope-scripts/src/features/fingerprinting-hardware')
const screenProtection = require('../../../shared/content-scope-scripts/src/features/fingerprinting-screen-size')
const contentScopeFeatures = require('../../../shared/content-scope-scripts/src/content-scope-features')

const configReference = require('../../data/reference-tests/fingerprinting-protections/config_reference.json')
const testSets = require('../../data/reference-tests/fingerprinting-protections/tests.json')

const jsdom = require('jsdom')
const { JSDOM } = jsdom

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Fingerprinting protection tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config: configReference })

            return tdsStorage.getLists().then(lists => tds.setLists(lists))
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            it(`${test.name}`, (done) => {
                const dom = new JSDOM('', {
                    url: 'https://example.com/',
                    runScripts: 'outside-only'
                })

                contentScopeFeatures.

                // mock non-standard APIs not implemented by jsdom
                const BatteryManager = function BatteryManager () {}

                dom.window.BatteryManager = BatteryManager
                dom.window.navigator.getBattery = () => Promise.resolve(new BatteryManager())

                Object.defineProperty(dom.window.Navigator.prototype, 'deviceMemory', { get: () => 128, configurable: true })
                Object.defineProperty(dom.window.Screen.prototype, 'availTop', { get: () => 12345, configurable: true })
                Object.defineProperty(dom.window.Screen.prototype, 'availLeft', { get: () => 12345, configurable: true })

                // init protections
                batteryProtection.init({}, dom.window)
                hardwareProtection.init({}, dom.window)
                screenProtection.init({}, dom.window)

                // validate result
                const result = dom.window.eval(test.property)

                function check (result) {
                    const resultString = result === undefined ? 'undefined' : result.toString()
                    expect(resultString).toBe(test.expectPropertyValue)
                    done()
                }

                if (result instanceof Promise) {
                    result.then(check)
                } else {
                    check(result)
                }
            })
        })
    })
}

import 'fake-indexeddb/auto';

const tds = require('../../../shared/js/background/trackers');
const tdsStorageStub = require('../../helpers/tds');
const tdsStorage = require('../../../shared/js/background/storage/tds').default;

const tabManager = require('../../../shared/js/background/tab-manager');
const { getArgumentsObject } = require('../../../shared/js/background/helpers/arguments-object');

const BatteryProtection = require('@duckduckgo/content-scope-scripts/injected/src/features/fingerprinting-battery').default;
const batteryProtection = new BatteryProtection('fingerprintingBattery');
const HardwareProtection = require('@duckduckgo/content-scope-scripts/injected/src/features/fingerprinting-hardware').default;
const hardwareProtection = new HardwareProtection('fingerprintingHardware');
const ScreenProtection = require('@duckduckgo/content-scope-scripts/injected/src/features/fingerprinting-screen-size').default;
const screenProtection = new ScreenProtection('fingerprintingScreenSize');
const TempStorageProtection = require('@duckduckgo/content-scope-scripts/injected/src/features/fingerprinting-temporary-storage').default;
const tempStorageProtection = new TempStorageProtection('fingerprintingTemporaryStorage');
const { isFeatureBroken } = require('@duckduckgo/content-scope-scripts/injected/src/utils');

const configReference = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/config_reference.json');
const testSets = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/tests.json');
const apiMocksInit = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/init');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const orgGlobalThis = globalThis;

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName];
    const testsToRun = testSet.tests.filter((test) => !(test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')));
    if (testsToRun.length === 0) {
        // all tests are being skipped
        continue;
    }

    describe(`Fingerprinting protection tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            tdsStorageStub.stub({ config: configReference });

            return tdsStorage.getLists().then((lists) => tds.setLists(lists));
        });

        afterEach(() => {
            // eslint-disable-next-line no-global-assign
            globalThis = orgGlobalThis;
        });

        testsToRun.forEach((test) => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return;
            }

            it(`${test.name}`, async () => {
                tabManager.delete(1);
                tabManager.create({
                    tabId: 1,
                    url: test.siteURL,
                });

                const args = getArgumentsObject(1, { url: test.siteURL, frameId: 0 }, test.siteURL, 'abc123');
                const dom = new JSDOM('', {
                    url: 'https://example.com/',
                    runScripts: 'outside-only',
                });

                // mock non-standard APIs not implemented by jsdom
                apiMocksInit(dom.window);

                // eslint-disable-next-line no-global-assign
                globalThis = dom.window;

                // init protections
                if (!isFeatureBroken(args, 'fingerprintingBattery')) {
                    batteryProtection.callInit(args);
                }
                if (!isFeatureBroken(args, 'fingerprintingHardware')) {
                    hardwareProtection.callInit(args);
                }
                if (!isFeatureBroken(args, 'fingerprintingScreenSize')) {
                    screenProtection.callInit(args);
                }
                if (!isFeatureBroken(args, 'fingerprintingTemporaryStorage')) {
                    tempStorageProtection.callInit(args);
                }

                // validate result
                const result = await dom.window.eval(test.property);

                function check(resultValue) {
                    const resultString = resultValue === undefined ? 'undefined' : resultValue.toString();
                    expect(resultString).toBe(test.expectPropertyValue);
                }

                check(result);
            });
        });
    });
}

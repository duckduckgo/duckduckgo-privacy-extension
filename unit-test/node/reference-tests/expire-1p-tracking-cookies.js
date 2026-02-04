import 'fake-indexeddb/auto';

const tds = require('../../../shared/js/background/trackers');
const tdsStorageStub = require('../../helpers/tds');
const tdsStorage = require('../../../shared/js/background/storage/tds').default;

const { handleRequest } = require('../../../shared/js/background/before-request');
const tabManager = require('../../../shared/js/background/tab-manager');
const { getArgumentsObject } = require('../../../shared/js/background/helpers/arguments-object');

const configReference = require('@duckduckgo/privacy-reference-tests/expire-first-party-js-cookies/config_reference.json');
const blocklistReference = require('@duckduckgo/privacy-reference-tests/expire-first-party-js-cookies/tracker_radar_reference.json');
const testSets = require('@duckduckgo/privacy-reference-tests/expire-first-party-js-cookies/tests.json');

const jsdom = require('jsdom');
const constants = require('../../../shared/data/constants');
const { JSDOM } = jsdom;

const orgGlobalThis = globalThis;

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName];

    describe(`Expire tracking 1p cookies / ${testSet.name} /`, () => {
        beforeAll(() => {
            tdsStorageStub.stub({ config: configReference, tds: blocklistReference });

            return tdsStorage.getLists().then((lists) => tds.setLists(lists));
        });

        afterEach(() => {
            // eslint-disable-next-line no-global-assign
            globalThis = orgGlobalThis;
        });

        testSet.tests.forEach((test) => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return;
            }

            it(`${test.name}`, (done) => {
                tabManager.delete(1);
                tabManager.create({
                    tabId: 1,
                    url: test.siteURL,
                });

                const args = getArgumentsObject(1, { url: test.siteURL, frameId: 0 }, test.siteURL, 'abc123');
                args.bundledConfig = configReference;

                const cookieJar = new jsdom.CookieJar();
                const dom = new JSDOM('', {
                    url: test.siteURL,
                    cookieJar,
                });

                const jsdomWindow = dom.window;

                // fake call stack to mock that provided script is a caller
                jsdomWindow.Error = function () {
                    this.stack = test.scriptURL + ':11:123';
                };

                // eslint-disable-next-line no-global-assign
                globalThis = jsdomWindow;

                const utils = require('@duckduckgo/content-scope-scripts/injected/src/utils');
                utils.setGlobal(jsdomWindow);

                const JsCookieProtection = require('@duckduckgo/content-scope-scripts/injected/src/features/cookie').default;
                const importConfig = {
                    trackerLookup: [],
                    injectName: 'extensionTest',
                };
                const jsCookieProtection = new JsCookieProtection('cookie', importConfig, {}, args);

                jsCookieProtection.callLoad({
                    platform: constants.platform,
                });
                jsCookieProtection.callInit(args);

                spyOn(chrome.tabs, 'sendMessage').and.callFake((tabId, msg) => {
                    if (tabId === 1) {
                        jsCookieProtection.update(msg);
                    }
                });

                handleRequest({
                    tabId: 1,
                    url: test.scriptURL,
                    type: 'script',
                });

                const setDate = Date.now();
                jsdomWindow.document.cookie = test.setDocumentCookie;

                // original cookie is set and then, async, expiration date is updated
                // we want to wait for that update, so we also have to be async
                setImmediate(() => {
                    const outputCookies = cookieJar.getCookiesSync(test.siteURL);

                    if (test.expectCookieSet) {
                        expect(outputCookies.length).toEqual(1);
                        const cookie = outputCookies[0];

                        if (test.expectExpiryToBe === -1) {
                            expect(cookie.isPersistent()).toBe(false);
                        } else {
                            expect(cookie.isPersistent()).toBe(true);
                            // extract expiry date in seconds from when cookie was set
                            const diff = Math.floor((cookie.expiryDate().getTime() - setDate) / 1000);
                            expect(diff).toBe(test.expectExpiryToBe);
                        }
                    } else {
                        expect(outputCookies.length).toEqual(0);
                    }

                    done();
                });
            });
        });
    });
}

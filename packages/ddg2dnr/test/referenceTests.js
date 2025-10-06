const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { actualMatchOutcome } = require('./utils/helpers');
const { generateDNRRule } = require('../lib/utils');
const { generateSmarterEncryptionRuleset } = require('../lib/smarterEncryption');
const { generateTdsRuleset } = require('../lib/tds');
const { generateCookieBlockingRuleset } = require('../lib/cookies');
const { generateTrackerAllowlistRules } = require('../lib/trackerAllowlist');
const { generateExtensionConfigurationRuleset } = require('../lib/extensionConfiguration');
const { USER_ALLOWLISTED_PRIORITY } = require('../lib/rulePriorities');

/**
 * @typedef {import('./utils/helpers').testFunction} testFunction
 */

function referenceTestPath(...args) {
    return require.resolve(path.join('@duckduckgo/privacy-reference-tests', ...args));
}

function loadReferenceTestJSONFile(...pathParts) {
    return JSON.parse(fs.readFileSync(referenceTestPath(...pathParts), { encoding: 'utf8', flag: 'r' }));
}

function* testCases(referenceTests) {
    for (const { name: testGroup, tests: testGroupTestCases } of Object.values(referenceTests)) {
        for (const testCase of testGroupTestCases) {
            const { exceptPlatforms } = testCase;
            if (exceptPlatforms?.includes('web-extension-mv3')) {
                continue;
            }
            testCase.testDescription = testGroup + ': ' + testCase.name;
            yield testCase;
        }
    }
}

describe('Reference Tests', /** @this {testFunction} */ () => {
    it('TR-domain-matching', /** @this {testFunction} */ async function () {
        const blockList = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'tracker_radar_reference.json');
        const referenceTests = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'domain_matching_tests.json');

        // Note - This should be taken from surrogates.txt, not hardcoded.
        const supportedSurrogateScripts = new Set(['tracker', 'script.js']);

        const isRegexSupported = this.browser.isRegexSupported.bind(this.browser);
        const { ruleset } = await generateTdsRuleset(blockList, supportedSurrogateScripts, '/', isRegexSupported);

        await this.browser.addRules(ruleset);

        for (const { testDescription, requestURL: requestUrl, requestType, siteURL: websiteUrl, expectAction: expectedAction } of testCases(
            referenceTests,
        )) {
            const { actualAction } = await actualMatchOutcome(this.browser, { requestUrl, requestType, websiteUrl });

            // TODO: Check the redirection path is correct. Not possible
            //       currently, since the expected redirect path is a data URI
            //       instead of the script filename/path.
            assert.equal(actualAction, expectedAction || 'ignore', testDescription);
        }
    });

    it('http-upgrades', /** @this {testFunction} */ async function () {
        const domains = fs
            .readFileSync(referenceTestPath('https-upgrades', 'https_upgrade_hostnames.txt'), { encoding: 'utf8', flag: 'r' })
            .split('\n');

        const referenceTests = loadReferenceTestJSONFile('https-upgrades', 'tests.json');

        await this.browser.addRules(generateSmarterEncryptionRuleset(domains));

        for (const { testDescription, requestURL: requestUrl, siteURL: websiteUrl, expectURL: expectedUrl, requestType } of testCases(
            referenceTests,
        )) {
            const { protocol: initialProtocol } = new URL(requestUrl);
            const { protocol: expectedProtocol } = new URL(expectedUrl);
            const expectedUpgrade = initialProtocol.length < expectedProtocol.length;

            const { actualAction } = await actualMatchOutcome(this.browser, { requestUrl, requestType, websiteUrl });
            let actualUpgrade = actualAction === 'upgradeScheme';

            // Note: Stop skipping these test cases once support for
            //       Smarter Encryption Allowlisting has been added.
            if (actualUpgrade && testDescription.includes('remote config')) {
                actualUpgrade = false;
            }

            assert.equal(actualUpgrade, expectedUpgrade, testDescription);
        }
    });

    describe('cookie blocking', /** @this {testFunction} */ async function () {
        const referenceTestsBase = 'block-third-party-tracking-cookies';
        const referenceTests = loadReferenceTestJSONFile(referenceTestsBase, 'tests.json');
        let cookieRules = [];

        this.beforeAll(async function () {
            const tds = loadReferenceTestJSONFile(referenceTestsBase, 'tracker_radar_reference.json');
            const config = loadReferenceTestJSONFile(referenceTestsBase, 'config_reference.json');

            // TODO: legacy feature name in test config. Should be changed to 'cookies'
            const excludedCookieDomains = config.features.trackingCookies3p.settings.excludedCookieDomains.map((e) => e.domain);
            const siteAllowlist = config.features.trackingCookies3p.exceptions.map((e) => e.domain);
            const unprotectedTemporary = config.unprotectedTemporary.map((e) => e.domain);

            cookieRules = generateCookieBlockingRuleset(
                tds,
                excludedCookieDomains,
                [...siteAllowlist, ...unprotectedTemporary],
                1000,
            ).ruleset;
        });

        this.beforeEach(
            /** @this {testFunction} */ async function () {
                await this.browser.addRules(cookieRules);
            },
        );

        for (const {
            testDescription,
            requestURL: requestUrl,
            siteURL: websiteUrl,
            expectCookieHeadersRemoved,
            expectSetCookieHeadersRemoved,
        } of testCases(referenceTests)) {
            // exclude document.cookie specs (DNR only does header cookies)
            if (!testDescription.startsWith('document.cookie')) {
                it(
                    testDescription,
                    /** @this {testFunction} */ async function () {
                        const { actualMatchedRules } = await actualMatchOutcome(this.browser, { requestUrl, websiteUrl });
                        if (expectCookieHeadersRemoved || expectSetCookieHeadersRemoved) {
                            assert.equal(actualMatchedRules.length, 1);
                            const firstMatch = actualMatchedRules[0];
                            assert.equal(firstMatch.action.type, 'modifyHeaders');
                            assert.equal(firstMatch.action.requestHeaders[0].header, 'cookie');
                            assert.equal(firstMatch.action.responseHeaders[0].header, 'set-cookie');
                        } else {
                            assert.equal(actualMatchedRules.length, 0);
                        }
                    },
                );
            }
        }
    });

    describe('Tracker Allowlist', /** @this {testFunction} */ async function () {
        const referenceTests = loadReferenceTestJSONFile(
            'tracker-radar-tests',
            'TR-domain-matching',
            'tracker_allowlist_matching_tests.json',
        );
        let blockAndAllowRules = [];

        this.beforeAll(
            /** @this {testFunction} */ async function () {
                const blockList = loadReferenceTestJSONFile(
                    'tracker-radar-tests',
                    'TR-domain-matching',
                    'tracker_allowlist_tds_reference.json',
                );
                const allowlistedTrackers = loadReferenceTestJSONFile(
                    'tracker-radar-tests',
                    'TR-domain-matching',
                    'tracker_allowlist_reference.json',
                );
                const mockConfig = {
                    features: {
                        trackerAllowlist: {
                            state: 'enabled',
                            settings: {
                                allowlistedTrackers,
                            },
                        },
                    },
                };
                const isRegexSupported = this.browser.isRegexSupported.bind(this.browser);
                const { ruleset } = await generateTdsRuleset(blockList, new Set(), '/', isRegexSupported);
                let ruleId = 10000;
                blockAndAllowRules = ruleset;
                for (const { rule } of generateTrackerAllowlistRules(mockConfig)) {
                    blockAndAllowRules.push({ id: ruleId++, ...rule });
                }
            },
        );
        this.beforeEach(
            /** @this {testFunction} */ async function () {
                await this.browser.addRules(blockAndAllowRules);
            },
        );

        for (const { description, request: requestUrl, site: websiteUrl, isAllowlisted, exceptPlatforms } of referenceTests) {
            if (exceptPlatforms && exceptPlatforms.includes('web-extension-mv3')) {
                continue;
            }
            it(
                description,
                /** @this {testFunction} */ async function () {
                    const { actualAction } = await actualMatchOutcome(this.browser, { requestUrl, websiteUrl });
                    assert.equal(actualAction, isAllowlisted ? 'ignore' : 'block', description);
                },
            );
        }
    });

    describe('Request Blocklist', /** @this {testFunction} */ async function () {
        const testPath = 'request-blocklist';
        const tests = loadReferenceTestJSONFile(testPath, 'tests.json');
        const userAllowlist = loadReferenceTestJSONFile(testPath, 'user-allowlist-reference.json');
        const tds = loadReferenceTestJSONFile(testPath, 'tds-reference.json');
        const config = loadReferenceTestJSONFile(testPath, 'config-reference.json');

        // Note: This should be taken from surrogates.txt, not hardcoded.
        const supportedSurrogateScripts = new Set(['noop.js']);

        const nextId = (ruleset) => (ruleset?.length ? ruleset[ruleset.length - 1].id + 1 : 1);

        let combinedRuleset;

        this.beforeAll(
            /** @this {testFunction} */ async function () {
                // Note: Hardcoded since rule generation logic lives outside of ddg2dnr,
                //       see dnr-user-allowlist.js.
                const userAllowlistRuleset = [
                    generateDNRRule({
                        id: 1,
                        priority: USER_ALLOWLISTED_PRIORITY,
                        actionType: 'allowAllRequests',
                        resourceTypes: ['main_frame'],
                        requestDomains: userAllowlist,
                    }),
                ];

                const isRegexSupported = this.browser.isRegexSupported.bind(this.browser);
                const { ruleset: tdsRuleset } = await generateTdsRuleset(
                    tds,
                    supportedSurrogateScripts,
                    '/',
                    isRegexSupported,
                    nextId(userAllowlistRuleset),
                );
                const { ruleset: configRuleset } = await generateExtensionConfigurationRuleset(
                    config,
                    [],
                    isRegexSupported,
                    nextId(tdsRuleset),
                );

                combinedRuleset = [...userAllowlistRuleset, ...tdsRuleset, ...configRuleset];
            },
        );

        this.beforeEach(
            /** @this {testFunction} */ async function () {
                await this.browser.addRules(combinedRuleset);
            },
        );

        for (const testSet of Object.values(tests)) {
            describe(
                testSet.desc,
                /** @this {testFunction} */ async function () {
                    for (const {
                        name,
                        requestUrl,
                        requestType,
                        websiteUrl,
                        expectAction: expectedAction,
                        exceptPlatforms,
                    } of testSet.tests) {
                        if (exceptPlatforms?.includes('web-extension-mv3')) {
                            continue;
                        }

                        it(
                            name,
                            /** @this {testFunction} */ async function () {
                                let { actualAction } = await actualMatchOutcome(this.browser, { requestUrl, requestType, websiteUrl });
                                if (actualAction === 'ignore') {
                                    actualAction = 'allow';
                                }
                                assert.equal(actualAction, expectedAction, name);
                            },
                        );
                    }
                },
            );
        }
    });
});

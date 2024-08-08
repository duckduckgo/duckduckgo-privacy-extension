const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
    generateSmarterEncryptionRuleset
} = require('../lib/smarterEncryption')
const {
    generateTdsRuleset
} = require('../lib/tds')
const { generateCookieBlockingRuleset } = require('../lib/cookies')
const { generateTrackerAllowlistRules } = require('../lib/trackerAllowlist')

function referenceTestPath (...args) {
    return require.resolve(path.join('@duckduckgo/privacy-reference-tests', ...args))
}

function loadReferenceTestJSONFile (...pathParts) {
    return JSON.parse(fs.readFileSync(referenceTestPath(...pathParts),
        { encoding: 'utf8', flag: 'r' }
    ))
}

function* testCases (referenceTests) {
    for (const {
        name: testGroup, tests: testGroupTestCases
    } of Object.values(referenceTests)) {
        for (const testCase of testGroupTestCases) {
            const { exceptPlatforms } = testCase
            if (exceptPlatforms?.includes('web-extension-mv3')) {
                continue
            }
            testCase.testDescription =
                testGroup + ': ' + testCase.name
            yield testCase
        }
    }
}

/**
 * @typedef {{
 *  beforeAll: (fn: () => Promise<any>) => Void;
 *  beforeEach: (fn: () => Promise<any>) => Void;
 *  browser: import('../puppeteerInterface').PuppeteerInterface;
 * }} testFunction
 */

describe('Reference Tests', /** @this {testFunction} */ () => {
    it('TR-domain-matching', /** @this {testFunction} */ async function () {
        const blockList = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'tracker_radar_reference.json')
        const referenceTests = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'domain_matching_tests.json')

        // Note - This should be taken from surrogates.txt, not hardcoded.
        const supportedSurrogateScripts = new Set(['tracker', 'script.js'])

        const isRegexSupported =
              this.browser.isRegexSupported.bind(this.browser)
        const { ruleset } = await generateTdsRuleset(
            blockList, supportedSurrogateScripts, '/', isRegexSupported
        )

        await this.browser.addRules(ruleset)

        for (const {
            testDescription, requestURL: initialUrl, requestType,
            siteURL: initiatorUrl, expectAction: expectedAction
        } of testCases(referenceTests)) {
            const actualMatchedRules = await this.browser.testMatchOutcome({
                url: initialUrl,
                initiator: initiatorUrl,
                type: requestType
            })

            let actualAction = 'ignore'
            const actualRedirects = []
            for (const rule of actualMatchedRules) {
                if (rule.action.type === 'block') {
                    actualAction = 'block'
                    continue
                }

                if (rule.action.type === 'redirect') {
                    actualRedirects.push(rule.action.redirect.extensionPath)
                }
            }

            if (actualAction === 'ignore' && actualRedirects.length > 0) {
                actualAction = 'redirect'

                // Note - Check the redirection path is correct. Not possible
                //        currently, since the expected redirect path is a data
                //        URI instead of the script filename/path.
            }

            assert.equal(
                actualAction,
                expectedAction || 'ignore',
                testDescription
            )
        }
    })

    it('http-upgrades', /** @this {testFunction} */ async function () {
        const domains = fs.readFileSync(
            referenceTestPath('https-upgrades', 'https_upgrade_hostnames.txt'),
            { encoding: 'utf8', flag: 'r' }
        ).split('\n')

        const referenceTests = loadReferenceTestJSONFile('https-upgrades', 'tests.json')

        await this.browser.addRules(generateSmarterEncryptionRuleset(domains))

        for (const {
            testDescription, requestURL: initialUrl,
            siteURL: initiatorUrl, expectURL: expectedUrl, requestType
        } of testCases(referenceTests)) {
            const { protocol: initialProtocol } = new URL(initialUrl)
            const { protocol: expectedProtocol } = new URL(expectedUrl)
            const expectedUpgrade =
                initialProtocol.length < expectedProtocol.length

            const actualMatchedRules = await this.browser.testMatchOutcome({
                url: initialUrl,
                initiator: initiatorUrl,
                type: requestType
            })

            let actualUpgrade = (
                actualMatchedRules.length === 1 &&
                actualMatchedRules[0].action.type === 'upgradeScheme'
            )

            // Note: Stop skipping these test cases once support for
            //       Smarter Encryption Allowlisting has been added.
            if (actualUpgrade && testDescription.includes('remote config')) {
                actualUpgrade = false
            }

            assert.equal(
                actualUpgrade, expectedUpgrade, testDescription
            )
        }
    })

    describe('cookie blocking', /** @this {testFunction} */ async function () {
        const referenceTestsBase = 'block-third-party-tracking-cookies'
        const referenceTests = loadReferenceTestJSONFile(referenceTestsBase, 'tests.json')
        let cookieRules = []

        this.beforeAll(async function () {
            const tds = loadReferenceTestJSONFile(referenceTestsBase, 'tracker_radar_reference.json')
            const config = loadReferenceTestJSONFile(referenceTestsBase, 'config_reference.json')

            // TODO: legacy feature name in test config. Should be changed to 'cookies'
            const excludedCookieDomains = config.features.trackingCookies3p.settings.excludedCookieDomains.map(e => e.domain)
            const siteAllowlist = config.features.trackingCookies3p.exceptions.map(e => e.domain)
            const unprotectedTemporary = config.unprotectedTemporary.map(e => e.domain)

            cookieRules = generateCookieBlockingRuleset(tds, excludedCookieDomains, [...siteAllowlist, ...unprotectedTemporary], 1000).ruleset
        })

        this.beforeEach(/** @this {testFunction} */ async function () {
            await this.browser.addRules(cookieRules)
        })

        for (const {
            testDescription, requestURL: initialUrl,
            siteURL: initiatorUrl, expectCookieHeadersRemoved,
            expectSetCookieHeadersRemoved
        } of testCases(referenceTests)) {
            // exclude document.cookie specs (DNR only does header cookies)
            if (!testDescription.startsWith('document.cookie')) {
                it(testDescription, /** @this {testFunction} */ async function () {
                    const actualMatchedRules = await this.browser.testMatchOutcome({
                        url: initialUrl,
                        initiator: initiatorUrl,
                        type: 'xmlhttprequest',
                        tabId: 1
                    })
                    if (expectCookieHeadersRemoved || expectSetCookieHeadersRemoved) {
                        assert.equal(actualMatchedRules.length, 1)
                        const firstMatch = actualMatchedRules[0]
                        assert.equal(firstMatch.action.type, 'modifyHeaders')
                        assert.equal(firstMatch.action.requestHeaders[0].header, 'cookie')
                        assert.equal(firstMatch.action.responseHeaders[0].header, 'set-cookie')
                    } else {
                        assert.equal(actualMatchedRules.length, 0)
                    }
                })
            }
        }
    })

    describe('Tracker Allowlist', /** @this {testFunction} */ async function () {
        const referenceTests = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'tracker_allowlist_matching_tests.json')
        let blockAndAllowRules = []

        this.beforeAll(/** @this {testFunction} */ async function () {
            const blockList = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'tracker_allowlist_tds_reference.json')
            const allowlistedTrackers = loadReferenceTestJSONFile('tracker-radar-tests', 'TR-domain-matching', 'tracker_allowlist_reference.json')
            const mockConfig = {
                features: {
                    trackerAllowlist: {
                        state: 'enabled',
                        settings: {
                            allowlistedTrackers
                        }
                    }
                }
            }
            const isRegexSupported = this.browser.isRegexSupported.bind(this.browser)
            const { ruleset } = await generateTdsRuleset(
                blockList, new Set(), '/', isRegexSupported
            )
            let ruleId = 10000
            blockAndAllowRules = ruleset
            for (const { rule } of generateTrackerAllowlistRules(mockConfig)) {
                const ruleWithId = { ...rule, id: ruleId++ };
                blockAndAllowRules.push(ruleWithId)
            }
        })
        this.beforeEach(/** @this {testFunction} */ async function () {
            await this.browser.addRules(blockAndAllowRules)
        })

        for (const {
            description, site, request, isAllowlisted, exceptPlatforms
        } of referenceTests) {
            if (exceptPlatforms && exceptPlatforms.includes('web-extension-mv3')) {
                continue
            }
            it(description, /** @this {testFunction} */ async function () {
                const actualMatchedRules = await this.browser.testMatchOutcome({
                    url: request,
                    initiator: site,
                    type: 'script'
                })
                // console.log('xxx', actualMatchedRules)

                let actualAction = 'ignore'
                const actualRedirects = []
                for (const rule of actualMatchedRules) {
                    if (rule.action.type === 'block') {
                        actualAction = 'block'
                        continue
                    }
                }

                if (actualAction === 'ignore' && actualRedirects.length > 0) {
                    actualAction = 'redirect'

                    // Note - Check the redirection path is correct. Not possible
                    //        currently, since the expected redirect path is a data
                    //        URI instead of the script filename/path.
                }

                assert.equal(
                    actualAction,
                    isAllowlisted ? 'ignore' : 'block',
                    description
                )
            })
        }
    })
})

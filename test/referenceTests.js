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

function referenceTestPath (...args) {
    return path.join(
        __dirname, '..', 'node_modules', '@duckduckgo/privacy-reference-tests',
        ...args
    )
}

function loadJSONFile (prefix, file) {
    return JSON.parse(fs.readFileSync(
        path.join(prefix, file),
        { encoding: 'utf8', flag: 'r' }
    ))
}

function* testCases (referenceTests) {
    for (const {
        name: testGroup, tests: testCases
    } of Object.values(referenceTests)) {
        for (const testCase of testCases) {
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

describe('Reference Tests', () => {
    it('TR-domain-matching', async function () {
        const referenceTestsPath = referenceTestPath(
            'tracker-radar-tests', 'TR-domain-matching'
        )

        const blockList = loadJSONFile(referenceTestsPath, 'tracker_radar_reference.json')

        const referenceTests = loadJSONFile(referenceTestsPath, 'domain_matching_tests.json')

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

    it('http-upgrades', async function () {
        const referenceTestsPath = referenceTestPath('https-upgrades')

        const domains = fs.readFileSync(
            path.join(referenceTestsPath, 'https_upgrade_hostnames.txt'),
            { encoding: 'utf8', flag: 'r' }
        ).split('\n')

        const referenceTests = loadJSONFile(referenceTestsPath, 'tests.json')

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

    describe('cookie blocking', async function () {
        const referenceTestsPath = referenceTestPath(
            'block-third-party-tracking-cookies'
        )
        const referenceTests = loadJSONFile(referenceTestsPath, 'tests.json')
        let cookieRules = []

        this.beforeAll(async function () {
            const tds = loadJSONFile(referenceTestsPath, 'tracker_radar_reference.json')
            const config = loadJSONFile(referenceTestsPath, 'config_reference.json')

            // TODO: legacy feature name in test config. Should be changed to 'cookies'
            const excludedCookieDomains = config.features.trackingCookies3p.settings.excludedCookieDomains.map(e => e.domain)
            const siteAllowlist = config.features.trackingCookies3p.exceptions.map(e => e.domain)
            const unprotectedTemporary = config.unprotectedTemporary.map(e => e.domain)

            cookieRules = generateCookieBlockingRuleset(tds, excludedCookieDomains, [...siteAllowlist, ...unprotectedTemporary], 1000).ruleset
        })

        this.beforeEach(async function () {
            await this.browser.addRules(cookieRules)
        })

        for (const {
            testDescription, requestURL: initialUrl,
            siteURL: initiatorUrl, expectCookieHeadersRemoved,
            expectSetCookieHeadersRemoved
        } of testCases(referenceTests)) {
            // exclude document.cookie specs (DNR only does header cookies)
            if (!testDescription.startsWith('document.cookie')) {
                it(testDescription, async function () {
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
})

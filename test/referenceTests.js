const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
    generateSmarterEncryptionRuleset
} = require('../lib/smarterEncryption')
const {
    generateTdsRuleset
} = require('../lib/tds')

function referenceTestPath (...args) {
    return path.join(
        __dirname, '..', 'node_modules', '@duckduckgo/privacy-reference-tests',
        ...args
    )
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

        const blockList = JSON.parse(fs.readFileSync(
            path.join(referenceTestsPath, 'tracker_radar_reference.json'),
            { encoding: 'utf8', flag: 'r' }
        ))

        const referenceTests = JSON.parse(fs.readFileSync(
            path.join(referenceTestsPath, 'domain_matching_tests.json'),
            { encoding: 'utf8', flag: 'r' }
        ))

        const isRegexSupported =
              this.browser.isRegexSupported.bind(this.browser)
        const { ruleset } = await generateTdsRuleset(
            blockList, isRegexSupported
        )
        await this.browser.addRules(ruleset)

        for (const {
            testDescription, requestURL: initialUrl, requestType,
            siteURL: initiatorUrl, expectAction: expectedAction
        } of testCases(referenceTests)) {
            // Note: Stop skipping these test cases once support for
            //       Surrogates has been added.
            if (testDescription.startsWith('surrogate-tests:')) {
                continue
            }

            const actualMatchedRules = await this.browser.testMatchOutcome({
                url: initialUrl,
                initiator: initiatorUrl,
                type: requestType
            })
            const actualMatchedBlockingRules =
                  actualMatchedRules.filter(
                      rule => rule.action.type === 'block'
                  )

            // Note: This will needed to be expanded upon to cover
            //       non block/allow actions like redirections.
            const actualAction =
                  actualMatchedBlockingRules.length > 0
                      ? 'block'
                      : 'ignore'

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

        const referenceTests = JSON.parse(fs.readFileSync(
            path.join(referenceTestsPath, 'tests.json'),
            { encoding: 'utf8', flag: 'r' }
        ))

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
})

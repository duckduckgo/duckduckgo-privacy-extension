const fs = require('fs')
const process = require('process')

const { generateSmarterEncryptionRuleset } = require('./lib/smarterEncryption')
const { generateTrackerBlockingRuleset } = require('./lib/trackerBlocking')
const { generateTrackerBlockingAllowlistRuleset } =
      require('./lib/trackerBlockingAllowlist')

const [command, ...args] = process.argv.slice(2)

// FIXME - This is an extremely rough placeholder and is not accurate. It should
//         behave the same as chrome.declarativeNetRequest.isRegexSupported.
// See:
//  - https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#method-isRegexSupported
//  - https://source.chromium.org/chromium/chromium/src/+/main:components/url_pattern_index/url_pattern_index.cc;l=566-619
async function isRegexSupported ({ regex, isCaseSensitive }) {
    return { isSupported: regex.length < 120 }
}

async function main () {
    switch (command) {
    case 'smarter-encryption':
        if (args.length !== 2) {
            console.error(
                'Usage: npm run smarter-encryption',
                './domains-list-input.txt ./ruleset-output.json'
            )
        } else {
            const [domainsFilePath, rulesetFilePath] = args
            fs.writeFileSync(
                rulesetFilePath,
                JSON.stringify(
                    generateSmarterEncryptionRuleset(
                        fs.readFileSync(
                            domainsFilePath,
                            { encoding: 'utf8' }
                        ).split('\n')
                    ),
                    null,
                    '\t'
                )
            )
        }
        break
    case 'tracker-blocking':
        if (args.length < 2 || args.length > 3) {
            console.error(
                'Usage: npm run tracker-blocking',
                './tds-input.json ./ruleset-output.json',
                '[./domain-by-rule-id-output.txt]'
            )
        } else {
            const [tdsFilePath, rulesetFilePath, mappingFilePath] = args

            const { ruleset, trackerDomainByRuleId } =
                  await generateTrackerBlockingRuleset(
                      JSON.parse(
                          fs.readFileSync(tdsFilePath, { encoding: 'utf8' })
                      ),
                      isRegexSupported
                  )

            fs.writeFileSync(
                rulesetFilePath,
                JSON.stringify(ruleset, null, '\t')
            )

            if (mappingFilePath) {
                fs.writeFileSync(
                    mappingFilePath,
                    trackerDomainByRuleId.join('\n')
                )
            }
        }
        break
    case 'tracker-blocking-allowlist':
        if (args.length < 2 || args.length > 3) {
            console.error(
                'Usage: npm run tracker-blocking-allowlist',
                './extension-config-input.json ./ruleset-output.json ',
                '[./domain-and-reason-by-rule-id-output.json]'
            )
        } else {
            const [
                extensionConfigFilePath, rulesetFilePath, mappingFilePath
            ] = args

            const { ruleset, trackerDomainAndReasonByRuleId } =
                  await generateTrackerBlockingAllowlistRuleset(
                      JSON.parse(
                          fs.readFileSync(
                              extensionConfigFilePath, { encoding: 'utf8' }
                          )
                      )
                  )

            fs.writeFileSync(
                rulesetFilePath,
                JSON.stringify(ruleset, null, '\t')
            )

            if (mappingFilePath) {
                fs.writeFileSync(
                    mappingFilePath,
                    JSON.stringify(trackerDomainAndReasonByRuleId, null, '\t')
                )
            }
        }
        break

    default:
        console.error('Unknown command!')
    }
}

main()

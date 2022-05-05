const fs = require('fs')
const path = require('path')

const puppeteer = require('puppeteer')
const browserFetcher = puppeteer.createBrowserFetcher()

exports.mochaHooks = {
    async beforeAll () {
        // Figure out the correct path for the recent snapshot build of Chromium
        // that's installed.
        // Note: Once chrome.declarativeNetRequest.testMatchOutcome is available
        //       in release builds (likely around Chrome M104), this code and
        //       the .npmrc file can be removed.
        const revision = parseInt(
            fs.readFileSync(
                path.join(__dirname, '..', '..', '.npmrc'),
                { encoding: 'utf8', flag: 'r' }
            ).match(/[0-9]+/),
            10
        )
        const { executablePath } = await browserFetcher.revisionInfo(revision)

        const browser = this.browser = await puppeteer.launch({
            executablePath,
            headless: 'chrome',
            args: [
                '--disable-extensions-except=test/data/chrome-extension/',
                '--load-extension=test/data/chrome-extension/'
            ]
        })

        // For some reason, a tab must be opened before the extension is
        // initialized.
        await browser.newPage()

        const findBackgroundWorker = () => {
            const backgroundWorkerTarget = browser.targets().find(
                target => target.type() === 'service_worker'
            )
            return backgroundWorkerTarget.worker()
        }

        /**
         * Loads the given declarativeNetRequest rules into the test extension.
         * @param {object[]} rules
         *   The rules to add.
         */
        this.addRules = async function (rules) {
            const backgroundWorker = await findBackgroundWorker()

            await backgroundWorker.evaluate(async rules => {
                if (typeof self.ruleById === 'undefined') {
                    self.ruleById = new Map()
                }

                for (const rule of rules) {
                    self.ruleById.set(rule.id, rule)
                }

                await chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                })
            }, rules)
        }

        /**
         * Removes the given declarativeNetRequest rules from the test extension.
         * @param {object[]} rules
         *   The rules to remove.
         *   Note: Only the rule.id property is strictly required.
         */
        this.removeRules = async function (rules) {
            const backgroundWorker = await findBackgroundWorker()

            await backgroundWorker.evaluate(async rules => {
                const ruleIds = []
                for (const rule of rules) {
                    if (typeof self.ruleById !== 'undefined') {
                        self.ruleById.delete(rule.id)
                    }
                    ruleIds.push(rule.id)
                }

                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: ruleIds
                })
            }, rules)
        }

        /**
         * Clear all declarativeNetRequest rules from the test extension.
         * Note: This is also called automatically after each test case.
         */
        this.clearAllRules = async function (rules) {
            const backgroundWorker = await findBackgroundWorker()

            await backgroundWorker.evaluate(async () => {
                if (typeof self.ruleById === 'undefined') {
                    return
                }

                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: Array.from(self.ruleById.keys())
                })

                delete self.ruleById
            })
        }

        /**
         * @typedef {object} testRequestDetails
         * @property {string} url
         *   The request URL.
         * @property {string} type
         *   The request type, e.g. 'main_frame'.
         *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
         * @property {string} [initiator]
         *   The initiator URL. If omitted, an opaque origin is used.
         * @property {string} [method]
         *   The request method. Defaults to 'get' for HTTP requests and is
         *   ignored for non-HTTP requests.
         *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RequestMethod
         */

        /**
          * Tests which rules (if any) match the given request details. Returns an
          * array of matching rules.
          * @param {testRequestDetails} testRequest
          *   The request details to match against.
          * @return {object[]}
          *   The matching rules (if any).
          */
        this.testMatchOutcome = async function (testRequest) {
            const backgroundWorker = await findBackgroundWorker()

            return await backgroundWorker.evaluate(
                async (testRequest) =>
                    new Promise(resolve =>
                        chrome.declarativeNetRequest.testMatchOutcome(
                            testRequest,
                            ({ matchedRules }) => {
                                resolve(
                                    matchedRules.map(
                                        ({ ruleId }) =>
                                            self.ruleById.get(ruleId) ||
                                            { id: ruleId }
                                    )
                                )
                            }
                        )
                    )
                , testRequest
            )
        }
    },
    async afterAll () {
        await this.browser.close()
    },
    async beforeEach () {
        await this.clearAllRules()
    }
}

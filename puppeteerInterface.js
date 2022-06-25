/** @module puppeteerInterface */

const path = require('path')
const puppeteer = require('puppeteer')

class PuppeteerInterface {
    async setupBrowser () {
        const testExtensionPath = path.join(
            __dirname, 'test', 'data', 'chrome-extension'
        )

        // Open the browser, installing the test extension.
        this.browser = await puppeteer.launch({
            headless: 'chrome',
            args: [
                '--disable-extensions-except=' + testExtensionPath,
                '--load-extension=' + testExtensionPath
            ]
        })

        // Find the background ServiceWorker for the extension.
        const backgroundWorkerTarget =
              await this.browser.waitForTarget(
                  target => target.type() === 'service_worker',
                  { timeout: 2000 }
              )
        this.backgroundWorker = await backgroundWorkerTarget.worker()
    }

    async closeBrowser () {
        await this.ready
        await this.browser.close()
    }

    constructor () {
        this.ready = this.setupBrowser()
    }

    /**
     * @typedef {object} RegexOptions
     * @property {string} regex
     * @property {bool} [isCaseSensitive]
     * @property {bool} [requireCapturing]
     * See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RegexOptions
     */

    /**
     * Returns true if the given regexFilter condition will work for
     * declarativeNetRequest rules, false otherwise.
     * @param {RegexOptions} regexOptions
     * @return {bool}
     */
    async isRegexSupported (regexOptions) {
        await this.ready
        return await this.backgroundWorker.evaluate(regexOptions =>
            new Promise(
                resolve => {
                    chrome.declarativeNetRequest.isRegexSupported(
                        regexOptions, resolve
                    )
                }
            )
        , regexOptions)
    }

    /**
     * Load the given declarativeNetRequest rules into the test
     * extension.
     * @param {object[]} rules
     *   The rules to add.
     */
    async addRules (rules) {
        await this.ready
        await this.backgroundWorker.evaluate(async rules => {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: rules
            })

            if (typeof self.ruleById === 'undefined') {
                self.ruleById = new Map()
            }
            for (const rule of rules) {
                self.ruleById.set(rule.id, rule)
            }
        }, rules)
    }

    /**
     * Remove the given declarativeNetRequest rules from the test
     * extension.
     * @param {object[]} rules
     *   The rules to remove.
     *   Note: Only the rule.id property is strictly required.
     */
    async removeRules (rules) {
        await this.ready
        await this.backgroundWorker.evaluate(async rules => {
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
     */
    async clearAllRules (rules) {
        await this.ready
        await this.backgroundWorker.evaluate(async () => {
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
     * @typedef {object} TestRequestDetails
     * @property {string} url
     *   The request URL.
     * @property {string} type
     *   The request type, e.g. 'main_frame'.
     *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
     * @property {string} [initiator]
     *   The initiator URL. If omitted, an opaque origin is used.
     * @property {string} [method]
     *   The request method. Defaults to 'get' for HTTP requests and
     *   is ignored for non-HTTP requests.
     * See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RequestMethod
     */

    /**
      * Tests which rules (if any) match the given request details.
      * Returns an array of matching rules.
      * @param {TestRequestDetails} testRequest
      *   The request details to match against.
      * @return {object[]}
      *   The matching rules (if any).
      */
    async testMatchOutcome (testRequest) {
        await this.ready
        return await this.backgroundWorker.evaluate(
            async testRequest =>
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
}

exports.PuppeteerInterface = PuppeteerInterface

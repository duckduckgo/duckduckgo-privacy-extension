/** @module puppeteerInterface */

// @ts-nocheck - ruleById property on self Object inside background
//               ServiceWorker context for the extension is cumbersome to type
//               hint with JSDoc comments.

const path = require('path');
const puppeteer = require('puppeteer');

class PuppeteerInterface {
    async setupBrowser() {
        const testExtensionPath = path.join(__dirname, 'test', 'data', 'chrome-extension');

        // Open the browser, installing the test extension.
        this.browser = await puppeteer.launch({
            headless: 'chrome',
            pipe: true,
            enableExtensions: [testExtensionPath],
        });

        // Find the background ServiceWorker for the extension.
        const backgroundWorkerTarget = await this.browser.waitForTarget((target) => target.type() === 'service_worker', { timeout: 2000 });
        this.backgroundWorker = await backgroundWorkerTarget.worker();
    }

    async closeBrowser() {
        await this.ready;
        await this.browser?.close();
    }

    constructor() {
        this.ready = this.setupBrowser();
    }

    /**
     * @typedef {object} RegexOptions
     * @property {string} regex
     * @property {boolean} [isCaseSensitive]
     * @property {boolean} [requireCapturing]
     * See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RegexOptions
     */

    /**
     * Returns true if the given regexFilter condition will work for
     * declarativeNetRequest rules, false otherwise.
     * @param {RegexOptions} regexOptions
     * @return {Promise<boolean>}
     */
    async isRegexSupported(regexOptions) {
        await this.ready;
        return await this.backgroundWorker?.evaluate(
            (options) =>
                new Promise((resolve) => {
                    chrome.declarativeNetRequest.isRegexSupported(options, resolve);
                }),
            regexOptions,
        );
    }

    /**
     * Load the given declarativeNetRequest rules into the test
     * extension.
     * @param {object[]} rules
     *   The rules to add.
     */
    async addRules(rules) {
        await this.ready;
        await this.backgroundWorker?.evaluate(async (addRules) => {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules,
            });

            if (typeof self.ruleById === 'undefined') {
                self.ruleById = new Map();
            }
            for (const rule of addRules) {
                self.ruleById.set(rule.id, rule);
            }
        }, rules);
    }

    /**
     * Remove the given declarativeNetRequest rules from the test
     * extension.
     * @param {object[]} rules
     *   The rules to remove.
     *   Note: Only the rule.id property is strictly required.
     */
    async removeRules(rules) {
        await this.ready;
        await this.backgroundWorker?.evaluate(async (removeRules) => {
            const ruleIds = [];
            for (const rule of removeRules) {
                if (typeof self.ruleById !== 'undefined') {
                    self.ruleById.delete(rule.id);
                }
                ruleIds.push(rule.id);
            }

            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIds,
            });
        }, rules);
    }

    /**
     * Clear all declarativeNetRequest rules from the test extension.
     */
    async clearAllRules(rules) {
        await this.ready;
        await this.backgroundWorker?.evaluate(async () => {
            if (typeof self.ruleById === 'undefined') {
                return;
            }

            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: Array.from(self.ruleById.keys()),
            });

            delete self.ruleById;
        });
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
     *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-RequestMethod
     * @property {number} [tabId]
     *   The ID of the tab in which the hypothetical request takes place.
     *   Does not need to correspond to a real tab ID. Default is -1,
     *   meaning that the request isn't related to a tab.
     */

    /**
     * Tests which rules (if any) match the given request details.
     * Returns an array of matching rules.
     * @param {TestRequestDetails} testRequest
     *   The request details to match against.
     * @return {Promise<object[]>}
     *   The matching rules (if any).
     */
    async testMatchOutcome(testRequest) {
        await this.ready;
        if (!this.backgroundWorker) return [];
        return await this.backgroundWorker.evaluate(
            async (testRequestDetails) =>
                new Promise((resolve) =>
                    chrome.declarativeNetRequest.testMatchOutcome(testRequestDetails, ({ matchedRules }) => {
                        resolve(matchedRules.map(({ ruleId }) => self.ruleById.get(ruleId) || { id: ruleId }));
                    }),
                ),
            testRequest,
        );
    }
}

exports.PuppeteerInterface = PuppeteerInterface;

const { PuppeteerInterface } = require('../../puppeteerInterface')

exports.mochaHooks = {
    async beforeAll() {
        this.timeout(20000)
        this.browser = new PuppeteerInterface()
        await this.browser.ready
    },
    async afterAll() {
        await this.browser.closeBrowser()
    },
    async beforeEach() {
        await this.browser.clearAllRules()
    },
}

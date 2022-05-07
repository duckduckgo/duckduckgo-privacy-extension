const { PuppeteerInterface } = require('../../puppeteerInterface')

exports.mochaHooks = {
    beforeAll () {
        this.browser = new PuppeteerInterface()
    },
    async afterAll () {
        await this.browser.closeBrowser()
    },
    async beforeEach () {
        await this.browser.clearAllRules()
    }
}

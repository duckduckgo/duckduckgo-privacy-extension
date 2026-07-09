const { BrowserInterface } = require('../../browserInterface');

exports.mochaHooks = {
    async beforeAll() {
        this.timeout(20000);

        const platform = process.env.DDG_PLATFORM || 'chrome';
        if (platform !== 'firefox' && platform !== 'chrome') {
            throw new Error('Unknown platform.');
        }

        this.browser = new BrowserInterface(platform);
        await this.browser.ready;
    },
    async afterAll() {
        await this.browser?.closeBrowser();
    },
    async beforeEach() {
        await this.browser.clearAllRules();
    },
};

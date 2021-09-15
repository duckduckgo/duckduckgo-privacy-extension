const browserUIWrapper = require('./../../base/ui-wrapper.es6.js')

module.exports = {
    openOptionsPage: function () {
        this.model.sendMessage('getBrowser').then(browser => {
            browserUIWrapper.openOptionsPage(browser)
        })
    }
}

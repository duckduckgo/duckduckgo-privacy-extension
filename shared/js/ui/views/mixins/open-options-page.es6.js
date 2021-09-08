const browserUIWrapper = require('./../../base/ui-wrapper.es6.js')

module.exports = {
    openOptionsPage: function () {
        this.model.fetch({ getBrowser: true }).then(browser => {
            browserUIWrapper.openOptionsPage(browser)
        })
    }
}

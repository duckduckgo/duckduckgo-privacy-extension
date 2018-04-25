const browserUIWrapper = require('./../../base/$BROWSER-ui-wrapper.es6.js')

module.exports = {
    openOptionsPage: function () {
        this.model.fetch({getBrowser: true}).then(browser => {
            browserUIWrapper.openOptionsPage(browser)
        })
    }
}

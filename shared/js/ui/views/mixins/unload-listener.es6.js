const browserUIWrapper = require('./../../base/ui-wrapper.es6.js')

module.exports = {
    /**
     * Collect any 'user-action' messages and pass them along
     * when we call `browserUIWrapper.popupUnloaded` - this allows the background script
     * to make a decision about whether to reload the current page.
     *
     * For example: If a user has manually disabled protections in the popup,
     * we don't immediately reload the page behind - but instead we want to wait until the
     * popup is closed.
     *
     * @param store
     */
    registerUnloadListener: function (store) {
        /** @type {string[]} */
        const userActions = []
        store.subscribe.on('action:site', (event) => {
            if (event.action === 'user-action') {
                userActions.push(event.data)
            }
        })
        window.addEventListener('unload', function () {
            browserUIWrapper.popupUnloaded(userActions)
        }, false)
    }
}

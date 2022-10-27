import browser from 'webextension-polyfill'

module.exports = {
    /**
     * Passes any 'user-action' messages through a messaging connection to the
     * extension's background, so that they can be used at the point this window
     * is closed. This allows the background script to make a decision about
     * whether to reload the current page.
     *
     * For example: If a user has manually disabled protections in the popup,
     * we don't immediately reload the page behind - but instead we want to wait
     * until the popup is closed.
     *
     * @param store
     */
    registerUnloadListener: function (store) {
        /** @type {string[]} */
        const userActions = []
        let connection = null

        // Create a messaging connection to the background. If the connection is
        // broken by the background, the background ServiceWorker was restarted
        // and the connection must be recreated + any earlier user actions
        // resent.
        const reconnect = () => {
            connection = browser.runtime.connect({ name: 'popup' })
            connection.onDisconnect.addListener(reconnect)
            for (const userAction of userActions) {
                connection.postMessage(userAction)
            }
        }
        reconnect()

        store.subscribe.on('action:site', (event) => {
            if (event.action === 'user-action') {
                userActions.push(event.data)
                connection.postMessage(event.data)
            }
        })
    }
}

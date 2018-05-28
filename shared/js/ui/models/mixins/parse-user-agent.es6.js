const browserUIWrapper = require('./../../base/$BROWSER-ui-wrapper.es6.js')

module.exports = {
    parseUserAgentString (uaString) {
        if (!uaString) uaString = window.navigator.userAgent

        let browser
        let version

        try {
            const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9]+)/)
            browser = rgx[1]
            version = rgx[2]

            if (browser === 'Safari') {
                version = uaString.match(/Version\/(\d+)/)[1]
            }
        } catch (e) {
            // unlikely, prevent extension from exploding if we don't recognize the UA
            browser = version = ''
        }

        const extensionVersion = browserUIWrapper.getExtensionVersion()
        return {
            browser: browser,
            version: version,
            extension: extensionVersion
        }
    }
}

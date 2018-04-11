const browserUIWrapper = require('./../../base/$BROWSER-ui-wrapper.es6.js')

module.exports = {
  parseUserAgentString (uaString) {
    if (!uaString) uaString = window.navigator.userAgent
    const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9.]+)/)
    const extensionVersion = browserUIWrapper.getExtensionVersion()
    return {
      browser: rgx[1],
      version: rgx[2],
      extension: extensionVersion
    }
  }
}

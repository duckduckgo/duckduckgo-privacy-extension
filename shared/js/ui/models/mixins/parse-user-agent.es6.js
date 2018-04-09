const browserWrapper = require('./../../../background/$BROWSER-wrapper.es6')

module.exports = {
  parseUserAgentString (uaString) {
    if (!uaString) uaString = window.navigator.userAgent
    const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9.]+)/)
    const extensionVersion = browserWrapper.getExtensionVersion()
    return {
      browser: rgx[1],
      version: rgx[2],
      extension: extensionVersion
    }
  }
}

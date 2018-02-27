module.exports = {
  parseUserAgentString (uaString) {
    if (!uaString) uaString = window.navigator.userAgent
    const rgx = uaString.match(/(Firefox|Chrome)\/([0-9.]+)/)

    return {
      browser: rgx[1],
      version: rgx[2]
    }
  }
}

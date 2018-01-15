module.exports = {
  parseUserAgentString (uaString) {
    if (!uaString) uaString = window.navigator.userAgent
    const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9]+)/)
    return {
      browser: rgx[1],
      majorVersion: rgx[2]
    }
  }
}

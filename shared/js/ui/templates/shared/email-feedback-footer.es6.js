module.exports = function (browserInfo, url) {
  let footer = '---\n'

  if (url) {
    footer += `URL is ${url}\n`
  }

  // TODO fix this so it's not hardcoded
  let extensionVersion = `2018.18.22`

  footer += `Browser is ${browserInfo.browser} ${browserInfo.version}
Extension version is ${extensionVersion}`

  return footer
}

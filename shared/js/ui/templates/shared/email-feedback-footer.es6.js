module.exports = function (browserInfo, url) {
  let footer = '---'

  if (url) {
    footer += `\nURL is ${url}`
  }

  footer += `\nBrowser is ${browserInfo.browser} ${browserInfo.version}`

  return footer
}

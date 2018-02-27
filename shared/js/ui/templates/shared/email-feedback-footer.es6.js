module.exports = function (browserInfo, url) {
  let footer = '---\n'
  let extensionVersion = chrome.runtime.getManifest().version

  if (url) {
    footer += `URL is ${url}\n`
  }

  footer += `Browser is ${browserInfo.browser} ${browserInfo.version}
Extension version is ${extensionVersion}`

  return footer
}

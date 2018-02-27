module.exports = function (browserInfo, url) {
  let footer = '---'

  if (url) {
    footer += `\nURL is ${url}`
  }

  return footer
}

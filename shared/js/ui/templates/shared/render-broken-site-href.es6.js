module.exports = function (browser, url) {
  return `mailto:extension-brokensites@duckduckgo.com?subject=${browser}%20Extension%20Broken%20Site%20Report&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0A1%2E%20Which%20website%20is%20broken%3F%20%28copy%20and%20paste%20the%20URL%29%0A%0A2%2E%20Describe%20the%20issue%2E%20%28What%27s%20breaking%20on%20the%20page%3F%20Attach%20a%20screenshot%20if%20possible%29%0A%0A----URL%20is%20${encodeURIComponent(url)}`
}

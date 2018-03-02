const emailFeedbackFooter = require('./email-feedback-footer.es6.js')

module.exports = function (browserInfo, url) {
  let subject = `${browserInfo.browser} Extension Broken Site Report`
  let body = `Help us improve by sharing a little info about the issue you've encountered.

1. Which website is broken? (copy and paste the URL)

2. Describe the issue. (What's breaking on the page? Attach a screenshot if possible)

${emailFeedbackFooter(browserInfo, url)}`

  return `mailto:extension-brokensites@duckduckgo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

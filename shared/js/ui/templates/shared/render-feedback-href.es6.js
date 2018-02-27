const emailFeedbackFooter = require('./email-feedback-footer.es6.js')

module.exports = function (browserInfo, url) {
  let subject = `${browserInfo.browser} Extension Feedback`
  let body = `Help us improve by sharing a little info about the issue you've encountered.

Tell us which features or functionality your feedback refers to. What do you love? What isn't working? How could it be improved?

${emailFeedbackFooter(browserInfo, url)}`

  return `mailto:extension-feedback@duckduckgo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

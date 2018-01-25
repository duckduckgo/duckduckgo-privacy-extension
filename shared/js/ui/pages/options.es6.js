const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6.js')
const PrivacyOptionsView = require('./../views/privacy-options.es6.js')
const PrivacyOptionsModel = require('./../models/privacy-options.es6.js')
const privacyOptionsTemplate = require('./../templates/privacy-options.es6.js')
const WhitelistView = require('./../views/whitelist.es6.js')
const WhitelistModel = require('./../models/whitelist.es6.js')
const whitelistTemplate = require('./../templates/whitelist.es6.js')
const BackgroundMessageModel = require('./../models/background-message.es6.js')
const parseUserAgentString = require('./../models/mixins/parse-user-agent.es6.js')

function Options (ops) {
  Parent.call(this, ops)
}

Options.prototype = window.$.extend({},
  Parent.prototype,
  mixins.setBrowserClassOnBodyTag,
  parseUserAgentString,
  {

    pageName: 'options',

    ready: function () {
      var $parent = window.$('#options-content')
      Parent.prototype.ready.call(this)

      this.setBrowserClassOnBodyTag()
      this.isBrowser = this.parseUserAgentString().browser
      this.generateFeedbackLink()
      this.generateReportSiteLink()

      this.views.options = new PrivacyOptionsView({
        pageView: this,
        model: new PrivacyOptionsModel({}),
        appendTo: $parent,
        template: privacyOptionsTemplate
      })

      this.views.whitelist = new WhitelistView({
        pageView: this,
        model: new WhitelistModel({}),
        appendTo: $parent,
        template: whitelistTemplate
      })

      this.message = new BackgroundMessageModel({})
    },

    generateFeedbackLink: function () {
      const mailto = `mailto:extension-feedback@duckduckgo.com?subject=${this.isBrowser}%20Extension%20Feedback&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0ATell%20us%20which%20features%20or%20functionality%20your%20feedback%20refers%20to%2E%20What%20do%20you%20love%3F%20What%20isn%27t%20working%3F%20How%20could%20it%20be%20improved%3F%20%20%0A%0A`
      window.$('.js-feedback-link').attr('href', mailto)
    },

    generateReportSiteLink: function () {
      const mailto = `mailto:extension-brokensites@duckduckgo.com?subject=${this.isBrowser}%20Extension%20Broken%20Site%20Report&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0A1%2E%20Which%20website%20is%20broken%3F%20%28copy%20and%20paste%20the%20URL%29%0A%0A2%2E%20Describe%20the%20issue%2E%20%28What%27s%20breaking%20on%20the%20page%3F%20Attach%20a%20screenshot%20if%20possible%29%0A%0A`
      window.$('.js-report-site-link').attr('href', mailto)
    }
  }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Options()

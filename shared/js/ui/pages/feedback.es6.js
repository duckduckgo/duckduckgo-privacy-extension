const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6')
const parseUserAgentString = require('./../models/mixins/parse-user-agent.es6.js')
const FeedbackFormView = require('../views/feedback-form.es6')
const FeedbackFormModel = require('../models/feedback-form.es6')

function Feedback (ops) {
    Parent.call(this, ops)
}

Feedback.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    mixins.parseQueryString,
    parseUserAgentString,
    {

        pageName: 'feedback',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.setBrowserClassOnBodyTag()

            let params = this.parseQueryString(window.location.search)
            let browserInfo = this.parseUserAgentString()

            this.form = new FeedbackFormView({
                appendTo: window.$('.js-feedback-form'),
                model: new FeedbackFormModel({
                    isBrokenSite: params.broken,
                    url: decodeURIComponent(params.url || ''),
                    browser: browserInfo.browser,
                    browserVersion: browserInfo.version,
                    extensionVersion: browserInfo.extension
                })
            })
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Feedback()

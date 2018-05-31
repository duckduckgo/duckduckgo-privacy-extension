const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6')
const parseUserAgentString = require('../../shared-utils/parse-user-agent-string.es6.js')
const FeedbackFormView = require('../views/feedback-form.es6')
const FeedbackFormModel = require('../models/feedback-form.es6')

function Feedback (ops) {
    Parent.call(this, ops)
}

Feedback.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    mixins.parseQueryString,
    {

        pageName: 'feedback',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.setBrowserClassOnBodyTag()

            let params = this.parseQueryString(window.location.search)
            let browserInfo = parseUserAgentString()

            this.form = new FeedbackFormView({
                appendTo: window.$('.js-feedback-form'),
                model: new FeedbackFormModel({
                    isBrokenSite: params.broken,
                    url: decodeURIComponent(params.url || ''),
                    browser: browserInfo.browser,
                    browserVersion: browserInfo.version
                })
            })
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Feedback()

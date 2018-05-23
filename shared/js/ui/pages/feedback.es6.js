const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6')
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

            this.form = new FeedbackFormView({
                appendTo: window.$('.js-feedback-form'),
                model: new FeedbackFormModel({
                    isBrokenSite: params.broken,
                    url: params.url
                })
            })
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Feedback()

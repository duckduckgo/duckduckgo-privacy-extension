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
    {

        pageName: 'feedback',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.setBrowserClassOnBodyTag()

            this.form = new FeedbackFormView({
                appendTo: window.$('.js-feedback-form'),
                model: new FeedbackFormModel({
                })
            })
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Feedback()

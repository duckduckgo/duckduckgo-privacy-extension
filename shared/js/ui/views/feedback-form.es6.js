const Parent = window.DDG.base.View
const feedbackFormTemplate = require('../templates/feedback-form.es6')

function FeedbackForm (ops) {
    this.model = ops.model
    this.template = feedbackFormTemplate

    Parent.call(this, ops)
}

FeedbackForm.prototype = window.$.extend({},
    Parent.prototype,
    {
    }
)

module.exports = FeedbackForm

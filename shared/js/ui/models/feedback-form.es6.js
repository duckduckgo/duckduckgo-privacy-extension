const Parent = window.DDG.base.Model

function FeedbackForm (attrs) {
    attrs = attrs || {}
    attrs.isBrokenSite = attrs.isBrokenSite || false
    attrs.url = attrs.url || ''
    Parent.call(this, attrs)
}

FeedbackForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'feedbackForm',

        submit: function () {
            console.log('YES')
        }
    }
)

module.exports = FeedbackForm

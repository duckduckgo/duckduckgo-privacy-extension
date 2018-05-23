const Parent = window.DDG.base.Model

function FeedbackForm (attrs) {
    attrs = attrs || {}
    attrs.isBrokenSite = attrs.isBrokenSite || false
    attrs.url = attrs.url || ''
    attrs.message = attrs.message || ''
    attrs.canSubmit = false
    Parent.call(this, attrs)

    this.updateCanSubmit()
}

FeedbackForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'feedbackForm',

        submit: function () {
            if (!this.canSubmit) { return }

            console.log('SUBMIT!!!')
        },

        toggleBrokenSite: function (val) {
            this.set('isBrokenSite', val)
            this.updateCanSubmit()
            this.reset()
        },

        updateCanSubmit: function () {
            if (this.isBrokenSite) {
                this.set('canSubmit', !!(this.url && this.message))
            } else {
                this.set('canSubmit', !!this.message)
            }
        },

        reset: function () {
            this.set('url', '')
            this.set('message', '')
            this.set('canSubmit', false)
        }
    }
)

module.exports = FeedbackForm

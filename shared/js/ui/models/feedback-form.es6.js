const Parent = window.DDG.base.Model

function FeedbackForm (attrs) {
    attrs = attrs || {}
    attrs.isBrokenSite = attrs.isBrokenSite || false
    attrs.url = attrs.url || ''
    attrs.message = attrs.message || ''
    attrs.canSubmit = false
    attrs.submitted = false

    attrs.browser = attrs.browser || ''
    attrs.browserVersion = attrs.browserVersion || ''
    attrs.extensionVersion = attrs.extensionVersion || ''

    Parent.call(this, attrs)

    this.updateCanSubmit()
}

FeedbackForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'feedbackForm',

        submit: function () {
            if (!this.canSubmit || this._submitting) { return }

            this._submitting = true

            $.ajax('https://andrey.duckduckgo.com/collect.js?type=extension-feedback', {
                method: 'POST',
                data: {
                    broken: this.isBrokenSite ? 1 : 0,
                    url: this.url || '',
                    message: this.message || '',
                    browser: this.browser || '',
                    browserVersion: this.browserVersion || '',
                    version: this.extensionVersion || ''
                },
                success: () => {
                    this.set('submitted', true)
                },
                error: () => {
                    this.set('errored', true)
                }
            })

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

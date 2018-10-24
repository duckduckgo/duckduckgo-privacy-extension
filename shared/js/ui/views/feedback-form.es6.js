const Parent = window.DDG.base.View
const feedbackFormTemplate = require('../templates/feedback-form.es6')

function FeedbackForm (ops) {
    this.model = ops.model
    this.template = feedbackFormTemplate

    Parent.call(this, ops)

    this._setup()
}

FeedbackForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-feedback', [
                'url',
                'message',
                'broken-site',
                'submit'
            ])

            this.bindEvents([
                [this.store.subscribe, `change:feedbackForm`, this._onModelChange],
                [this.$url, `input`, this._onUrlChange],
                [this.$message, `input`, this._onMessageChange],
                [this.$brokensite, `change`, this._onBrokenSiteChange],
                [this.$submit, `click`, this._onSubmitClick]
            ])
        },

        _onModelChange: function (e) {
            if (e.change.attribute === 'isBrokenSite' ||
                    e.change.attribute === 'submitted' ||
                    e.change.attribute === 'errored') {
                this.unbindEvents()
                this._rerender()
                this._setup()
            } else if (e.change.attribute === 'canSubmit') {
                this.$submit.toggleClass('is-disabled', !this.model.canSubmit)
                this.$submit.attr('disabled', !this.model.canSubmit)
            }
        },

        _onBrokenSiteChange: function (e) {
            this.model.toggleBrokenSite(e.target.checked)
        },

        _onUrlChange: function () {
            this.model.set('url', this.$url.val())
            this.model.updateCanSubmit()
        },

        _onMessageChange: function () {
            this.model.set('message', this.$message.val())
            this.model.updateCanSubmit()
        },

        _onSubmitClick: function (e) {
            e.preventDefault()

            if (!this.model.canSubmit) { return }

            this.model.submit()

            this.$submit.addClass('is-disabled')
            this.$submit.val('Sending...')
        }
    }
)

module.exports = FeedbackForm

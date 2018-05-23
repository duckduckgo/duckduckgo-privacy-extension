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
                [this.$brokensite, `change`, this._onBrokenSiteChange],
                [this.$submit, `click`, this._onSubmitClick],
            ])
        },

        _onModelChange: function (e) {
            if (e.change.attribute === 'isBrokenSite') {
                this.unbindEvents()
                this._rerender()
                this._setup()
            }
        },

        _onBrokenSiteChange: function (e) {
            this.model.set('isBrokenSite', e.target.checked)
        },

        _onSubmitClick: function (e) {
            this.model.submit()
        }
    }
)

module.exports = FeedbackForm

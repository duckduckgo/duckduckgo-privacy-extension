const Parent = window.DDG.base.View
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

function BreakageForm (ops) {
    this.model = ops.model
    this.template = ops.template
    Parent.call(this, ops)

    this._setup()
}

BreakageForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-breakage-form', [
                'close'
            ])
            this.bindEvents([
                [this.$close, 'click', this._closeForm],
                [this.model.store.subscribe, 'action:site', this._handleAction]
            ])
        },

        _handleAction: function (notification) {
            if (notification.action === 'whitelistClick') this._openForm()
        },

        _openForm: function (e) {
            this.$el.removeClass('is-hidden')
        },

        _closeForm: function (e) {
            if (e) e.preventDefault()
            this.$el.addClass('is-hidden')
        }
    }
)

module.exports = BreakageForm

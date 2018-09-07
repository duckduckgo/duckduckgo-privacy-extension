const Parent = window.DDG.base.View
const browserWrapper = require('../base/$BROWSER-ui-wrapper.es6')

function PwnedMessage (ops) {
    this.hibp = ops.hibp
    this.domain = ops.domain
    this.template = require('../templates/pwned-message.es6')
    Parent.call(this, ops)

    this._setup()
}

PwnedMessage.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-hamburger-menu', [
                'close'
            ])
            this.bindEvents([
                [this.$close, 'click', this._closeMenu]
            ])
        },

        _closeMenu: function (e) {
            if (e) e.preventDefault()

            this.$el.addClass('is-hidden')
            browserWrapper.fetch({
                updateSetting: {
                    name: `hibpDismissed-${this.domain}`,
                    value: true
                }
            })
        }
    }
)

module.exports = PwnedMessage

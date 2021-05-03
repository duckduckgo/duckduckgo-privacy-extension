const { formatAddress } = require('../../background/email-utils.es6')

const Parent = window.DDG.base.View

function EmailAliasView (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    this.model.getUserData().then(userData => {
        this.model.set('userData', userData)
        Parent.call(this, ops)
        this._setup()
    })
}

EmailAliasView.prototype = window.$.extend({},
    Parent.prototype,
    {
        _copyAliasToClipboard: function () {
            const alias = this.model.userData.nextAlias
            navigator.clipboard.writeText(formatAddress(alias))
            this.$el.addClass('show-copied-label')
            this.$el.one('animationend', () => {
                this.$el.removeClass('show-copied-label')
            })

            this.model.fetch({ refreshAlias: true }).then(({ privateAddress }) => {
                this.model.userData.nextAlias = privateAddress
            })
        },

        _setup: function () {
            this.bindEvents([
                [this.$el, 'click', this._copyAliasToClipboard]
            ])
        }
    }
)

module.exports = EmailAliasView

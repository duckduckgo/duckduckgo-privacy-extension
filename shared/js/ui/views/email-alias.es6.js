const Parent = window.DDG.base.View

function EmailAliasView (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    this.model.getUserData().then(userData => {
        this.model.userData = userData
        Parent.call(this, ops)
        this._setup()
    })
}

EmailAliasView.prototype = window.$.extend({},
    Parent.prototype,
    {
        _copyAliasToClipboard: function () {
            this.model.fetch({getAlias: true}).then(({alias}) => {
                navigator.clipboard.writeText(alias)
                this.$el.addClass('show-copied-label')
                this.$el.one('animationend', () => {
                    this.$el.removeClass('show-copied-label')
                })
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

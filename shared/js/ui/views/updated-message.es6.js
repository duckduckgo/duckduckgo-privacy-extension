const Parent = window.DDG.base.View

function UpdatedMessage (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-update-message', ['help', 'close'])
    this.bindEvents([
        [this.$help, 'click', this._helpClick],
        [this.$close, 'click', this._closeUpdateMessage]
    ])
}

UpdatedMessage.prototype = window.$.extend({},
    Parent.prototype,
    {
        _helpClick: function (e) {
            e.preventDefault()
            this.model.openHelpPage()
        },

        _closeUpdateMessage: function (e) {
            e.preventDefault()
            this.model.closeUpdateMessage()
        }
    }
)

module.exports = UpdatedMessage

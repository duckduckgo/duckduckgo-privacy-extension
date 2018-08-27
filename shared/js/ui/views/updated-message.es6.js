const Parent = window.DDG.base.View

function UpdatedMessage (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-update-message', ['help'])
    this.bindEvents([[this.$help, 'click', this._helpClick]])
}

UpdatedMessage.prototype = window.$.extend({}, 
    Parent.prototype,
    {
        _helpClick: function (e) {
            e.preventDefault()
            this.model.openHelpPage()
        }
    }
)

module.exports = UpdatedMessage

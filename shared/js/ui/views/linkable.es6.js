const Parent = window.DDG.base.View

function Linkable (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this.$linkableItem = window.$('#js-linkable-' + this.model.id)

    this.bindEvents([
        [this.$linkableItem, 'click', this._handleClick]
    ])
}

Linkable.prototype = window.$.extend({},
    Parent.prototype,
    {

        _handleClick: function (e) {
            this.model.link()
        }
    }
)

module.exports = Linkable

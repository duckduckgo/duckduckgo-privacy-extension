const Parent = window.DDG.base.View

function EnablePrompt (ops) {
//    this.model = ops.model
    this.template = ops.template

    Parent.call(this, ops)

    this._setup()
}

EnablePrompt.prototype = window.$.extend({},
    Parent.prototype,
    {
        _setup: function () {
            this._cacheElems('.js-enable-prompt', [])
            this.bindEvents([])
        }
    }
)

module.exports = EnablePrompt

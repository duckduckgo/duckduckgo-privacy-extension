const Parent = window.DDG.base.Model

function Linkable (attrs) {
    Parent.call(this, attrs)
}

Linkable.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'linkable'
    }
)

module.exports = Linkable

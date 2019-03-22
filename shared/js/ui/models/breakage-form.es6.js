const Parent = window.DDG.base.Model

function BreakageForm (attrs) {
    attrs = attrs || {}
    attrs.tabUrl = ''
    Parent.call(this, attrs)
}

BreakageForm.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'breakageForm'
    }
)

module.exports = BreakageForm

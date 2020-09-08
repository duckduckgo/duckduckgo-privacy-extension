const Parent = window.DDG.base.Model

function EmailAliasModel (attrs) {
    attrs = attrs || {}
    Parent.call(this, attrs)
}

EmailAliasModel.prototype = window.$.extend({},
    Parent.prototype,
    {
        modelName: 'emailAlias',

        getUserData: function () {
            return this.fetch({getSetting: {name: 'userData'}}).then(userData => userData)
        }
    }
)

module.exports = EmailAliasModel

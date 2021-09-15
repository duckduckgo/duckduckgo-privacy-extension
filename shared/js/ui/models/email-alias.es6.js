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
            return this.sendMessage('getSetting', { name: 'userData' }).then(userData => userData)
        },

        logout: function () {
            return this.sendMessage('logout').then(() => this.set('userData', undefined))
        }
    }
)

module.exports = EmailAliasModel

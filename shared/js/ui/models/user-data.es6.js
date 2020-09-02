const Parent = window.DDG.base.Model

function UserData (attrs) {
    Parent.call(this, attrs)

    this.setUserDataFromSettings()
}

UserData.prototype = window.$.extend({},
    Parent.prototype,
    {

        modelName: 'userData',

        logout () {
            console.log('logout')
            // 1. remove data from the store
        },

        setUserDataFromSettings: function () {
            let self = this
            this.fetch({getSetting: {name: 'userData'}}).then(({userName}) => {
                console.log('setting', userName)
                self.set('userName', userName)
            })
        }
    }
)

module.exports = UserData

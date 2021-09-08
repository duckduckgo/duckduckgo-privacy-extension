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
            this.fetch({ logout: true })
                .then(() => this.set('userName', null))
        },

        setUserDataFromSettings: function () {
            this.fetch({ getSetting: { name: 'userData' } })
                .then((data) => this.set('userName', data?.userName))
        }
    }
)

module.exports = UserData

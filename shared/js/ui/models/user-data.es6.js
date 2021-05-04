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
                .then(() => this.set('loggingOut', true))
        },

        setUserDataFromSettings: function () {
            this.fetch({ getSetting: { name: 'userData' } })
                .then(({ userName }) => this.set('userName', userName))
        }
    }
)

module.exports = UserData

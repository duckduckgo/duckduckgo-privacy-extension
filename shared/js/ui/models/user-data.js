const Parent = window.DDG.base.Model;

function UserData(attrs) {
    Parent.call(this, attrs);

    this.setUserDataFromSettings();
}

UserData.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'userData',

    logout() {
        this.sendMessage('logout').then(() => this.set('userName', null));
    },

    setUserDataFromSettings: function () {
        this.sendMessage('getSetting', { name: 'userData' }).then((data) => this.set('userName', data?.userName));
    },
});

module.exports = UserData;

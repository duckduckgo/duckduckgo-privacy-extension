/* global BUILD_TARGET */
const Parent = window.DDG.base.Model;

function PrivacyOptions(attrs) {
    // set some default values for the toggle switches in the template
    attrs.httpsEverywhereEnabled = true;
    attrs.GPC = false;
    attrs.fireButtonClearHistoryEnabled = true;
    attrs.fireButtonTabClearEnabled = true;
    attrs.useNoAiSearch = false;

    Parent.call(this, attrs);
}

PrivacyOptions.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'privacyOptions',

    toggle: function (k) {
        if (Object.hasOwnProperty.call(this, k)) {
            this[k] = !this[k];
            console.log(`PrivacyOptions model toggle ${k} is now ${this[k]}`);
            this.sendMessage('updateSetting', { name: k, value: this[k] });
        }
    },

    async getState() {
        const settings = await this.sendMessage('getSetting', 'all');

        this.httpsEverywhereEnabled = settings.httpsEverywhereEnabled;
        this.GPC = settings.GPC;
        this.fireButtonEnabled = BUILD_TARGET === 'chrome';
        this.fireButtonClearHistoryEnabled = settings.fireButtonClearHistoryEnabled;
        this.fireButtonTabClearEnabled = settings.fireButtonTabClearEnabled;
        this.useNoAiSearch = !!settings.useNoAiSearch;
    },
});

module.exports = PrivacyOptions;

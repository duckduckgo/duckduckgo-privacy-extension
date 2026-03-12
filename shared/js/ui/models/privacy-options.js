/* global BUILD_TARGET */
const Parent = window.DDG.base.Model;

function PrivacyOptions(attrs) {
    // set some default values for the toggle switches in the template
    attrs.httpsEverywhereEnabled = true;
    attrs.embeddedTweetsEnabled = false;
    attrs.GPC = false;
    attrs.youtubeClickToLoadEnabled = false;
    attrs.youtubePreviewsEnabled = false;
    attrs.fireButtonClearHistoryEnabled = true;
    attrs.fireButtonTabClearEnabled = true;
    attrs.alternativeSearch = '';

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

    setSetting: function (k, v) {
        if (Object.hasOwnProperty.call(this, k)) {
            this[k] = v;
            console.log(`PrivacyOptions model set ${k} to ${v}`);
            this.sendMessage('updateSetting', { name: k, value: v });
        }
    },

    async getState() {
        const [settings, youtubeClickToLoadEnabled] = await Promise.all([
            this.sendMessage('getSetting', 'all'),
            this.sendMessage('isClickToLoadYoutubeEnabled'),
        ]);

        this.httpsEverywhereEnabled = settings.httpsEverywhereEnabled;
        this.embeddedTweetsEnabled = settings.embeddedTweetsEnabled;
        this.GPC = settings.GPC;
        this.youtubeClickToLoadEnabled = youtubeClickToLoadEnabled;
        this.youtubePreviewsEnabled = settings.youtubePreviewsEnabled;
        this.fireButtonEnabled = BUILD_TARGET === 'chrome' || BUILD_TARGET === 'chrome-mv2';
        this.fireButtonClearHistoryEnabled = settings.fireButtonClearHistoryEnabled;
        this.fireButtonTabClearEnabled = settings.fireButtonTabClearEnabled;
        this.alternativeSearch = settings.alternativeSearch || '';
    },
});

module.exports = PrivacyOptions;

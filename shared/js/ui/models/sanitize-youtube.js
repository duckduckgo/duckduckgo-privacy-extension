const Parent = window.DDG.base.Model;

function SanitizeYoutube(attrs) {
    attrs.hideYoutubeComments = false;
    attrs.hideYoutubeRecommendations = false;
    attrs.hideYoutubeShorts = false;
    attrs.blurYoutubeThumbnails = false;
    Parent.call(this, attrs);
}

SanitizeYoutube.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'sanitizeYoutube',

    toggle: function (key) {
        if (!Object.hasOwnProperty.call(this, key)) {
            return;
        }
        this[key] = !this[key];
        this.sendMessage('updateSetting', { name: key, value: this[key] });
    },

    async getState() {
        const [hideYoutubeComments, hideYoutubeRecommendations, hideYoutubeShorts, blurYoutubeThumbnails] = await Promise.all([
            this.sendMessage('getSetting', { name: 'hideYoutubeComments' }),
            this.sendMessage('getSetting', { name: 'hideYoutubeRecommendations' }),
            this.sendMessage('getSetting', { name: 'hideYoutubeShorts' }),
            this.sendMessage('getSetting', { name: 'blurYoutubeThumbnails' }),
        ]);
        this.hideYoutubeComments = hideYoutubeComments === true;
        this.hideYoutubeRecommendations = hideYoutubeRecommendations === true;
        this.hideYoutubeShorts = hideYoutubeShorts === true;
        this.blurYoutubeThumbnails = blurYoutubeThumbnails === true;
    },
});

module.exports = SanitizeYoutube;

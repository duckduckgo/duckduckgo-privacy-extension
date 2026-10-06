const Parent = window.DDG.base.View;

function SanitizeYoutube(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.setup();
    this.model.getState().then(() => {
        this.rerender();
    });
}

SanitizeYoutube.prototype = window.$.extend({}, Parent.prototype, {
    _clickSetting: function (e) {
        const key = window.$(e.target).data('key') || window.$(e.target).parent().data('key');
        this.model.toggle(key);
        this.rerender();
    },

    setup: function () {
        this._cacheElems('.js-options', [
            'hide-youtube-comments',
            'hide-youtube-recommendations',
            'hide-youtube-shorts',
            'blur-youtube-thumbnails',
        ]);
        this.bindEvents([
            [this.$hideyoutubecomments, 'click', this._clickSetting],
            [this.$hideyoutuberecommendations, 'click', this._clickSetting],
            [this.$hideyoutubeshorts, 'click', this._clickSetting],
            [this.$bluryoutubethumbnails, 'click', this._clickSetting],
        ]);
    },

    rerender: function () {
        this.unbindEvents();
        this._rerender();
        this.setup();
    },
});

module.exports = SanitizeYoutube;

const Parent = window.DDG.base.View;

function PrivacyOptions(ops) {
    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.setup();
    this.model.getState().then(() => {
        this.rerender();
    });
}

PrivacyOptions.prototype = window.$.extend({}, Parent.prototype, {
    _clickSetting: function (e) {
        const key = window.$(e.target).data('key') || window.$(e.target).parent().data('key');
        console.log(`privacyOptions view click for setting "${key}"`);
        this.model.toggle(key);
        this.rerender();
    },

    _clickSearchEngine: function (e) {
        const engine = window.$(e.currentTarget).attr('data-engine');
        this.model.setSearchEngine(engine);
        this.rerender();
    },

    setup: function () {
        this._cacheElems('.js-options', [
            'blocktrackers',
            'https-everywhere-enabled',
            'gpc-enabled',
            'firebutton-clear-history-enabled',
            'firebutton-tabclear-enabled',
            'no-ai-mode',
            'search-engine',
        ]);
        this.bindEvents([
            [this.$blocktrackers, 'click', this._clickSetting],
            [this.$httpseverywhereenabled, 'click', this._clickSetting],
            [this.$gpcenabled, 'click', this._clickSetting],
            [this.$firebuttonclearhistoryenabled, 'click', this._clickSetting],
            [this.$firebuttontabclearenabled, 'click', this._clickSetting],
            [this.$noaimode, 'click', this._clickSetting],
            [this.$searchengine, 'click', this._clickSearchEngine],
        ]);
    },

    rerender: function () {
        this.unbindEvents();
        this._rerender();
        this.setup();
    },
});

module.exports = PrivacyOptions;

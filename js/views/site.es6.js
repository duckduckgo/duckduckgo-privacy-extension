const Parent = window.DDG.base.View;

var backgroundPage = chrome.extension.getBackgroundPage(); // FIXME probably centralize this?

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new site view");

    this._cacheElems('.js-site', [ 'whitelist-toggle-bg', 'whitelist-toggle-fg' ]);

    this.bindEvents([
      [this.$whitelisttogglebg, 'click', this._whitelistClick],
      [this.$whitelisttogglefg, 'click', this._whitelistClick]
    ]);

    // FIXME should be moved to the right place --- model?
    // _rerender() below should probably not be called directly but via a model change event
    var thisSite = this;

    backgroundPage.utils.getCurrentURL(function(url) {
                thisSite.model.domain = backgroundPage.utils.extractHostFromURL(url);
                thisSite._rerender();
    });
};

Site.prototype = $.extend({},
    Parent.prototype,
    {
        _whitelistClick: function (e) {
            console.log(`set whitelist for ${this.model.domain} to ${this.model.isWhitelisted}`);

            this.model.toggleWhitelist();
            this.pageView._rerender();
        }

    }

);

module.exports = Site;

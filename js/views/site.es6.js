const Parent = window.DDG.base.View;

var backgroundPage = chrome.extension.getBackgroundPage(); // FIXME probably centralize this?

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    console.log("new site view");

    this._cacheElems('.js-site', [ 'whitelist-toggle' ]);

    this.bindEvents([
      [this.$whitelisttoggle, 'click', this._whitelistClick]
    ]);

    // FIXME should be moved to the right place --- model?
    // _rerender() below should probably not be called directly but via a model change event
    var thisSite = this;
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function(tabData) {
            if (tabData.length){
                console.log("SITE!", tabData[0].url);
                thisSite.model.domain = backgroundPage.utils.extractHostFromURL(tabData[0].url);
                thisSite._rerender();
            }
    });
};

Site.prototype = $.extend({},
    Parent.prototype,
    {
        _whitelistClick: function (e) {
            console.log(`set whitelist for ${this.model.domain} to ${this.model.isWhitelisted}`);

            this.model.toggleWhitelist();
        }

    }

);

module.exports = Site;

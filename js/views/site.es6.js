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

    backgroundPage.utils.getCurrentTab(function(tab) {
        if(tab){
            let siteDomain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisSite.model.domain = siteDomain;
            let tabObj = backgroundPage.tabs[tab.id];
            if(tabObj){
                thisSite.model.trackerCount = tabObj.dispTotal;
            }
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

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

    var thisSite = this;

    backgroundPage.utils.getCurrentTab(function(tab) {
        if(tab){
            let siteDomain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisSite.model.domain = siteDomain;
            thisSite.model.tabId = tab.id;
            thisSite.model.updateTrackerCount();
            thisSite._rerender();
        }
    });

    chrome.runtime.onMessage.addListener(function(req, sender, res){
        if(req.rerenderPopup){
            thisSite.model.updateTrackerCount();
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

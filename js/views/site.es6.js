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
            console.log(tab);
            let siteDomain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisSite.model.domain = siteDomain;

            let tabObj = backgroundPage.tabs[tab.id];

            if(tabObj){
                thisSite.model.trackerCount = tabObj.dispTotal;
                tabObj.thisSite = thisSite;
            }

            thisSite._rerender();
        }
    });

    chrome.runtime.onMessage.addListener(function(req, sender, res){
        console.log("Request ", req);
        if(req.rerenderPopup){
            console.log("Rerender in view from message");
            console.log(thisSite);
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

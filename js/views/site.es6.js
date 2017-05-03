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
    var thisTab = null;

    function updateTrackerCount(){
        let tabObj = backgroundPage.tabs[thisTab];
        if(tabObj){
            thisSite.model.trackerCount = tabObj.dispTotal;
        }
    }

    backgroundPage.utils.getCurrentTab(function(tab) {
        if(tab){
            thisTab = tab.id;
            let siteDomain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisSite.model.domain = siteDomain;
            updateTrackerCount();
            thisSite._rerender();
        }
    });

    chrome.runtime.onMessage.addListener(function(req, sender, res){
        if(req.rerenderPopup){
            updateTrackerCount();
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

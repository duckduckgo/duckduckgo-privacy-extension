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


    // set up messaging to update the tracker count

    var thisView = this,
        thisModel = this.model;

    backgroundPage.utils.getCurrentTab(function(tab) {
        if(tab){
            thisModel.domain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisModel.tabId = tab.id;
            thisModel.updateTrackerCount();
            thisModel.setHttpsMessage();
            thisView._rerender();
        }
    });

    chrome.runtime.onMessage.addListener(function(req, sender, res){
        if(req.rerenderPopup){
            thisModel.updateTrackerCount();
            thisView._rerender();
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

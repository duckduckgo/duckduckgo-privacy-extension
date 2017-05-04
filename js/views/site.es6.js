const Parent = window.DDG.base.View;


var backgroundPage = chrome.extension.getBackgroundPage(); // FIXME probably centralize this?

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    // bind events
    this.setup();

    // set up messaging to update the tracker count
    var thisView = this,
        thisModel = this.model;

    backgroundPage.utils.getCurrentTab(function(tab) {
        if(tab){
            thisModel.domain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisModel.tabId = tab.id;
            thisModel.setSiteObj();
            thisModel.isWhitelisted = thisModel.site.whiteListed;
            thisModel.updateTrackerCount();
            thisModel.setHttpsMessage();
            thisView.rerender(); // our custom rerender below
        }
    });

    chrome.runtime.onMessage.addListener(function(req, sender, res){
        if(req.rerenderPopup){
            thisModel.updateTrackerCount();
            thisView.rerender(); // our custom rerender below
        }
    });

};

Site.prototype = $.extend({},
    Parent.prototype,
    {
        _whitelistClick: function (e) {

            this.model.toggleWhitelist();
            this.rerender();
        },

        setup: function() {

            this._cacheElems('.js-site', [ 'whitelist-toggle-bg', 'whitelist-toggle-fg' ]);

            this.bindEvents([
              [this.$whitelisttogglebg, 'click', this._whitelistClick],
              [this.$whitelisttogglefg, 'click', this._whitelistClick]
            ]);
            
        },

        rerender: function() {
            this.unbindEvents();
            this._rerender();
            this.setup();
        }

    }

);

module.exports = Site;

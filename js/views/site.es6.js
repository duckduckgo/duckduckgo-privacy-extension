const Parent = window.DDG.base.View;
const TrackerListSlidingSubview = require('./../views/trackerlist-sliding-subview.es6.js');
const tabbedTrackerListTemplate = require('./../templates/trackerlist-tabbed.es6.js');
const backgroundPage = chrome.extension.getBackgroundPage();

function Site (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.$body = $('body');

    // bind events
    this._setup();

    // set up messaging to update the tracker count
    var thisView = this,
        thisModel = this.model;

    backgroundPage.utils.getCurrentTab(function(tab) {
        if (tab) {
            thisModel.domain = backgroundPage.utils.extractHostFromURL(tab.url);
            thisModel.tab = backgroundPage.tabManager.get({"tabId": tab.id});
            thisModel.setSiteObj();

            if (thisModel.disabled) {   // determined in setSiteObj()
                thisView._setDisabled();
            }

            thisModel.updateTrackerCount();
            thisModel.setHttpsMessage();
            thisView.rerender(); // our custom rerender below

        } else {
            console.debug('Site view: no tab');
        }
    });

    // edge case, should not happen
    // '-' is the domain default in the pages/trackers.es6.js call
    if (this.domain === '-') {
        this.model.disabled = true;
        this._setDisabled();
    }

    chrome.runtime.onMessage.addListener(function(req, sender, res) {
        if (req.updateTrackerCount) {
            thisModel.updateTrackerCount();
            thisView.rerender(); // our custom rerender below
        }
    });

};

Site.prototype = $.extend({},
    Parent.prototype,
    {

        _setup: function() {

            this._cacheElems('.js-site', [
                'toggle',
                'show-all-trackers'
            ]);

            this.bindEvents([
              [this.$toggle, 'click', this._whitelistClick],
              [this.$showalltrackers, 'click', this._showAllTrackers]
            ]);


        },

        _whitelistClick: function (e) {
            this.model.toggleWhitelist();
            console.log('isWhitelisted: ', this.model.isWhitelisted);
            this.rerender();
        },

        rerender: function() {
            this.unbindEvents();
            this._rerender();
            this._setup();
        },

        _setDisabled: function() {
            this.$body.addClass('disabled');
        },

        _showAllTrackers: function () {
            if (this.$body.hasClass('disabled')) return;
            this.views.slidingSubview = new TrackerListSlidingSubview({
                template: tabbedTrackerListTemplate,
                defaultTab: 'page'
            });
        }

    }

);

module.exports = Site;

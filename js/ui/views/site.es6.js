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

    // get data from background page tab
    this.getBackgroundTabData();

    // edge case, should not happen
    // '-' is the domain default in the pages/trackers.es6.js call
    if (this.domain === '-') {
        this.model.disabled = true;
        this._setDisabled();
    }

    let self = this;
    chrome.runtime.onMessage.addListener(function(req, sender, res) {
        if (req.updateTrackerCount) {
            if (self.model.update()) thisView.rerender();
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

        getBackgroundTabData: function () {
            let self = this;

            backgroundPage.utils.getCurrentTab(function (tab) {
                if (tab) {
                    self.model.domain = backgroundPage.utils.extractHostFromURL(tab.url);
                    self.model.tab = backgroundPage.tabManager.get({'tabId': tab.id});
                    self.model.setSiteObj();

                    if (self.model.disabled) {   // determined in setSiteObj()
                        self._setDisabled();
                    }

                    self.model.update();
                    self.model.setHttpsMessage();
                    self.rerender(); // our custom rerender below

                } else {
                    console.debug('Site view: no tab');
                }
            });
        },

        _whitelistClick: function (e) {
            this.model.toggleWhitelist();
            console.log('isWhitelisted: ', this.model.isWhitelisted);

            chrome.tabs.reload(this.model.tab.id);
            const w = chrome.extension.getViews({type: 'popup'})[0];
            w.close()
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

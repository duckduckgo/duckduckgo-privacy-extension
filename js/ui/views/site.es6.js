const Parent = window.DDG.base.View;
const TrackerListSlidingSubview = require('./../views/trackerlist-sliding-subview.es6.js');
const tabbedTrackerListTemplate = require('./../templates/trackerlist-tabbed.es6.js');

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
              [this.$showalltrackers, 'click', this._showAllTrackers],
              [this.store.subscribe, 'change:backgroundMessage', this.updateTrackerCount]
            ]);

        },

        updateTrackerCount: function (message) {
            let self = this
            if (message.change.attribute === 'updateTrackerCount') {
                if (!this.model.tab) return
                
                let tabID = this.model.tab.id;
                
                this.model.fetch({getTab: tabID}).then( (backgroundTabObj) => {
                    self.model.tab = backgroundTabObj
                    self.model.update()
                    self._getSiteRating()
                })
            }
        },

        getBackgroundTabData: function () {
            let self = this;

            this.model.fetch({getCurrentTab: true}).then((tab) => {
                if (tab) {
                    this.model.fetch({getTab: tab.id}).then( (backgroundTabObj) => {
                        if (backgroundTabObj) {
                            self.model.tab = backgroundTabObj
                            self.model.domain = backgroundTabObj.site.domain
                            self._getSiteRating()
                        }

                        self.model.setSiteObj();

                        if (self.model.disabled) {   // determined in setSiteObj()
                            self._setDisabled();
                        }

                        self.model.update();
                        self.model.setHttpsMessage();
                        self.rerender(); // our custom rerender below
                    });

                } else {
                    console.debug('Site view: no tab');
                }
            });
        },

        _whitelistClick: function (e) {
            this.model.toggleWhitelist();
            console.log('isWhitelisted: ', this.model.isWhitelisted);
            this.model.set('whitelisted', this.isWhitelisted);
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
        },

        _getSiteRating: function () {
            this.model.fetch({getSiteScore: this.model.tab.id}).then((rating) => {
                if (rating && this.model.update(rating)) this.rerender();
            })
        }
    }

);

module.exports = Site;

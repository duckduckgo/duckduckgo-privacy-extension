const Parent = window.DDG.base.View;
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js');
const TrackerListSlidingSubview = require('./../views/trackerlist-sliding-subview.es6.js');
const tabbedTrackerListTemplate = require('./../templates/trackerlist-tabbed.es6.js');

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this.model.getTopBlocked().then(() => {
        this.rerenderList()
    })
};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    animateGraphBars,
    {

        _seeAllClick: function () {
            this.views.slidingSubview = new TrackerListSlidingSubview({
                template: tabbedTrackerListTemplate,
                defaultTab: 'all'
            });
        },

        _setup: function () {
            this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'see-all'])
            this.bindEvents([
                    [this.$seeall, 'click', this._seeAllClick]
            ]);
        },

        rerenderList: function() {
            this._rerender()
            this._setup()
            this.animateGraphBars()
        }
    }
);

module.exports = TrackerList;

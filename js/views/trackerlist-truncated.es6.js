const Parent = window.DDG.base.View;
const animateBars = require('./mixins/animate-bars.es6.js');
const TrackerListSlidingSubview = require('./../views/trackerlist-sliding-subview.es6.js');
const trackerListTemplate = require('./../templates/trackerlist-tabbed.es6.js');

function TrackerList (ops) {

    this.model = ops.model;
    this.pageView = ops.pageView;
    this.template = ops.template;

    Parent.call(this, ops);

    this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'see-all'])
    this.bindEvents([
        [this.$seeall, 'click', this._seeAllClick]
    ]);

    this.animateBars();
};

TrackerList.prototype = $.extend({},
    Parent.prototype,
    animateBars,
    {

        _seeAllClick: function () {
            this.views.tabbedTrackerLists = new TrackerListSlidingSubview({
                // model: TODO,
                template: trackerListTemplate,
                defaultTab: 'all'
            });
        }

    }
);

module.exports = TrackerList;

const Parent = window.DDG.base.View
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const TrackerListSlidingSubview = require('./../views/trackerlist-sliding-subview.es6.js')
const tabbedTrackerListTemplate = require('./../templates/trackerlist-tabbed.es6.js')

function TrackerList (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    Parent.call(this, ops)

    this.model.getTopBlocked().then(() => {
        this.rerenderList()
    })

    this.bindEvents([
        [this.model.store.subscribe, 'change:backgroundMessage', this.handleBackgroundMsg]
    ])
}

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
            this._cacheElems('.js-top-blocked', ['graph-bar-fg', 'pct', 'see-all'])
            this.bindEvents([
                [this.$seeall, 'click', this._seeAllClick]
            ]);
        },

        rerenderList: function () {
            this._rerender()
            this._setup()
            this.animateGraphBars()
        },

        handleBackgroundMsg: function (message) {
            if (!message || !message.change) return

            const attr = message.change.attribute
            if (attr === 'didResetTrackersData') {
                this.model.reset()
                this.rerenderList()
            }
        }
    }
);

module.exports = TrackerList;

const ParentSlidingSubview = require('./sliding-subview.es6.js')
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const TopBlockedTrackersModel = require('./../models/top-blocked.es6.js')

function TrackerList (ops) {
    // model data is async
    this.model = null
    this.numItems = ops.numItems
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)

    this.setupClose()
    this.renderAsyncContent()

    this.bindEvents([
        [this.model.store.subscribe, 'change:backgroundMessage', this.handleBackgroundMsg]
    ])
}

TrackerList.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    animateGraphBars,
    {

        setup: function () {
            this.$content = this.$el.find('.js-top-blocked-content')
            // listener for reset stats click
            this.$reset = this.$el.find('.js-reset-trackers-data')
            this.bindEvents([
                [this.$reset, 'click', this.resetTrackersStats]
            ])
        },

        renderAsyncContent: function () {
            const random = Math.round(Math.random()*100000)
            this.model = new TopBlockedTrackersModel({
                modelName: 'trackerListTopBlocked' + random,
                numCompanies: this.numItems
            })
            this.model.getTopBlocked().then(() => {
                const content = this.template()
                this.$el.append(content)
                this.setup()

                // animate graph bars and pct
                this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg')
                this.$pct = this.$el.find('.js-top-blocked-pct')
                this.animateGraphBars()
            })
        },

        resetTrackersStats: function () {
            this.model.fetch({resetTrackersData: true})
        },

        handleBackgroundMsg: function (message) {
            if (!message || !message.change) return

            const attr = message.change.attribute
            if (attr === 'didResetTrackersData') {
                this.model.reset()
                const content = this.template()
                this.$content.replaceWith(content)
            }
        }
    }
)

module.exports = TrackerList

const ParentSlidingSubview = require('./sliding-subview.es6.js')
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const SiteTrackersModel = require('./../models/trackerlist-site.es6.js')
const SiteModel = require('./../models/site.es6.js')
const TopBlockedTrackersModel = require('./../models/trackerlist-top-blocked.es6.js')

function TrackerList (ops) {
    this.selectedTab = ops.defaultTab // poss values: `page` or `all`
    this.model = null // model is set below, keys off this.selectedTab
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)
    this.updateList()

    this.setActiveTab()
    this.$navtab = this.$el.find('.js-nav-tab')

    this.bindEvents([
        [this.$navtab, 'click', this.switchTabs]
    ])
}

TrackerList.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    animateGraphBars,
    {

        setActiveTab: function () {
            let selector = '.js-nav-tab'
            this.$el.find(selector).removeClass('active')
            selector = selector + '-' + this.selectedTab
            this.$el.find(selector).addClass('active')
        },

        switchTabs: function (e) {
            e.preventDefault()
            let selector = '.js-nav-tab-' + this.selectedTab
            let $elHasClass = $(e.currentTarget).hasClass

            if (this.selectedTab === 'all') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'page'
                    this.updateList()
                    this.setActiveTab()
                }
            } else if (this.selectedTab === 'page') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'all'
                    this.updateList()
                    this.setActiveTab()
                }
            }
        },

        updateList: function () {
            const random = Math.round(Math.random()*100000)
            if (this.selectedTab === 'all') {
                const numItems = 10
                this.model = new TopBlockedTrackersModel({
                    modelName: 'trackerListTop' + numItems + 'Blocked' + random,
                    numCompanies: numItems
                })
                this.model.getTopBlocked().then(() => {
                    this.renderList()
                })
            } else if (this.selectedTab === 'page') {
                this.model = new SiteTrackersModel({
                    modelName: 'siteTrackerList-' + random
                })
                this.model.fetchAsyncData().then(() => {
                    // TODO: pick up here for rendering site detail data
                    // this.model.site = new SiteModel({
                    //     modelName: 'site' + random
                    // })
                    // this.model.getBackgroundTabData()
                    this.renderList()
                })
            }
        },

        renderList: function () {
            this.$el.find('.js-trackerlist-tab').remove()
            let ol = this.template()
            this.$el.append(ol)

            // all-time tracker list
            if (this.model.modelName.indexOf('trackerListTop') > -1) {
                // animate graph bars and pct
                this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg')
                this.$pct = this.$el.find('.js-top-blocked-pct')
                this.animateGraphBars()
                // listener for reset stats click
                this.$reset = this.$el.find('.js-reset-trackers-data')
                this.bindEvents([
                    [this.$reset, 'click', this.resetTrackersStats]
                ])
            }
        },

        resetTrackersStats: function () {
            let self = this
            this.model.fetch({resetTrackersData: true}).then(() => {
                self.updateList()
            })
        }
    }
)

module.exports = TrackerList

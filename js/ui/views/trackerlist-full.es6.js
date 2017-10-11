const ParentSlidingSubview = require('./sliding-subview.es6.js')
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const TopBlockedTrackersModel = require('./../models/trackerlist-top-blocked.es6.js')

function TrackerList (ops) {
    // model data is async
    this.model = null
    this.numItems = ops.numItems
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)

    this.setupClose()
    this.renderAsyncContent()
}

TrackerList.prototype = $.extend({},
    ParentSlidingSubview.prototype,
    animateGraphBars,
    {

        setup: function () {
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

        // TODO
        resetTrackersStats: function () {
            this.model.fetch({resetTrackersData: true}).then(() => {
                //this.updateTab()
                const content = this.template()
                this.$el.append(content)
            })
        }

        // updateTab: function () {
        //     const random = Math.round(Math.random()*100000)

        //     if (this.selectedTab === 'all') {
        //         const numItems = 10
        //         this.currentModelName = 'trackerListTop' + numItems + 'Blocked' + random
        //         this.currentSiteModelName = null
        //         this.model = new TopBlockedTrackersModel({
        //             modelName: this.currentModelName,
        //             numCompanies: numItems
        //         })
        //         this.model.getTopBlocked().then(() => {
        //             this.renderTabContent()
        //         })
        //     } else if (this.selectedTab === 'page') {
        //         // this.currentModelName = 'siteDetails' + random
        //         // this.currentSiteModelName = 'site' + random
        //         // this.model = new SiteDetailsModel({
        //         //     modelName: this.currentModelName
        //         // })
        //         // this.model.fetchAsyncData().then(() => {
        //         //     this.model.site = new SiteModel({
        //         //         modelName: this.currentSiteModelName
        //         //     })
        //         //     this.model.site.getBackgroundTabData().then(() => {
        //         //         this.renderTabContent()
        //         //     })
        //         // })
        //     }
        // },

        // renderTabContent: function () {
        //     this.$el.find('.js-trackerlist-tab').remove()
        //     let tabContent = this.template()
        //     this.$el.append(tabContent)

        //     // all-time tracker list tab
        //     if (this.model.modelName.indexOf('trackerListTop') > -1) {
        //         this.unbindEvents()
        //         this.setupNav()

        //         // animate graph bars and pct
        //         this.$graphbarfg = this.$el.find('.js-top-blocked-graph-bar-fg')
        //         this.$pct = this.$el.find('.js-top-blocked-pct')
        //         this.animateGraphBars()

        //         // listener for reset stats click
        //         this.$reset = this.$el.find('.js-reset-trackers-data')
        //         this.bindEvents([
        //             [this.$reset, 'click', this.resetTrackersStats]
        //         ])
        //     }

        //     // site-level details tab
        //     if (this.model.modelName.indexOf('siteDetails') > -1) {
        //         this.unbindEvents()
        //         this.setupNav()

        //         if (this.model.site) {
        //             this.bindEvents([
        //                 [this.store.subscribe, `change:${this.currentSiteModelName}` , this.renderTabContent]
        //             ])
        //         }
        //     }
        // },
    }
)

module.exports = TrackerList

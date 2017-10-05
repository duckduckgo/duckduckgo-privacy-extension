const ParentSlidingSubview = require('./sliding-subview.es6.js')
const animateGraphBars = require('./mixins/animate-graph-bars.es6.js')
const SiteTrackersModel = require('./../models/trackerlist-site.es6.js')
const SiteModel = require('./../models/site.es6.js')
const TopBlockedTrackersModel = require('./../models/trackerlist-top-blocked.es6.js')

function TrackerList (ops) {
    this.selectedTab = ops.defaultTab // poss values: `page` or `all`
    this.model = null // model is set below, keys off this.selectedTab
    this.currentModelName = null
    this.currentSiteModelName = null
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)
    this.updateTab()
    this.setActiveTab()
    this.setupNav()
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

        setupNav: function () {
            this.$navtab = this.$el.find('.js-nav-tab')
            this.bindEvents([
                [this.$navtab, 'click', this.switchTabs]
            ])
            this.setupClose()
        },

        switchTabs: function (e) {
            e.preventDefault()
            let selector = '.js-nav-tab-' + this.selectedTab
            let $elHasClass = $(e.currentTarget).hasClass

            if (this.selectedTab === 'all') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'page'
                    this.updateTab()
                    this.setActiveTab()
                }
            } else if (this.selectedTab === 'page') {
                if (!$(e.currentTarget).hasClass(selector)) {
                    this.selectedTab = 'all'
                    this.updateTab()
                    this.setActiveTab()
                }
            }
        },

        updateTab: function () {
            const random = Math.round(Math.random()*100000)

            if (this.selectedTab === 'all') {
                const numItems = 10
                this.currentModelName = 'trackerListTop' + numItems + 'Blocked' + random
                this.currentSiteModelName = null
                this.model = new TopBlockedTrackersModel({
                    modelName: this.currentModelName,
                    numCompanies: numItems
                })
                this.model.getTopBlocked().then(() => {
                    this.renderTabContent()
                })
            } else if (this.selectedTab === 'page') {
                this.currentModelName = 'siteTrackerList' + random
                this.currentSiteModelName = 'site' + random
                this.model = new SiteTrackersModel({
                    modelName: this.currentModelName
                })
                this.model.fetchAsyncData().then(() => {

                    // TODO: site model is shoe-horned in here
                    // because site.siteRating arrives async from
                    // background via `change:backgroundMessage`
                    // need to refactor SiteTrackersModel to use
                    // store.subscribe like Site Model to get
                    // rating
                    this.model.site = new SiteModel({
                        modelName: this.currentSiteModelName
                    })
                    this.model.site.getBackgroundTabData().then(() => {
                        this.renderTabContent()
                    })

                })
            }
        },

        renderTabContent: function () {
            this.$el.find('.js-trackerlist-tab').remove()
            let tabContent = this.template()
            this.$el.append(tabContent)

            // all-time tracker list tab
            if (this.model.modelName.indexOf('trackerListTop') > -1) {
                this.unbindEvents()
                this.setupNav()

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

            // site-level details tab
            if (this.model.modelName.indexOf('siteTrackerList') > -1) {
                this.unbindEvents()
                this.setupNav()

                if (this.model.site) {
                    this.bindEvents([
                        [this.store.subscribe, `change:${this.currentSiteModelName}` , this.renderTabContent]
                    ])
                }
            }
        },

        resetTrackersStats: function () {
            this.model.fetch({resetTrackersData: true}).then(() => {
                this.updateTab()
            })
        }
    }
)

module.exports = TrackerList

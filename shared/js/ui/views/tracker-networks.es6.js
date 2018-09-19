const ParentSlidingSubview = require('./sliding-subview.es6.js')
const heroTemplate = require('./../templates/shared/hero.es6.js')
const CompanyListModel = require('./../models/site-company-list.es6.js')
const SiteModel = require('./../models/site.es6.js')
const trackerNetworksIconTemplate = require('./../templates/shared/tracker-network-icon.es6.js')
const trackerNetworksTextTemplate = require('./../templates/shared/tracker-networks-text.es6.js')

function TrackerNetworks (ops) {
    // model data is async
    this.model = null
    this.currentModelName = null
    this.currentSiteModelName = null
    this.template = ops.template
    ParentSlidingSubview.call(this, ops)

    setTimeout(() => this._rerender(), 750)
    this.renderAsyncContent()
}

TrackerNetworks.prototype = window.$.extend({},
    ParentSlidingSubview.prototype,
    {

        setup: function () {
            this._cacheElems('.js-tracker-networks', [
                'hero',
                'details'
            ])

            // site rating arrives async
            this.bindEvents([[
                this.store.subscribe,
                `change:${this.currentSiteModelName}`,
                this._rerender
            ]])
        },

        renderAsyncContent: function () {
            const random = Math.round(Math.random() * 100000)
            this.currentModelName = 'siteCompanyList' + random
            this.currentSiteModelName = 'site' + random

            this.model = new CompanyListModel({
                modelName: this.currentModelName
            })
            this.model.fetchAsyncData().then(() => {
                this.model.site = new SiteModel({
                    modelName: this.currentSiteModelName
                })
                this.model.site.getBackgroundTabData().then(() => {
                    let content = this.template()
                    this.$el.append(content)
                    this.setup()
                    this.setupClose()
                })
            })
        },

        _renderHeroTemplate: function () {
            if (this.model.site) {
                const trackerNetworksIconName = trackerNetworksIconTemplate(
                    this.model.site.siteRating,
                    this.model.site.isWhitelisted,
                    this.model.site.totalTrackerNetworksCount
                )

                const trackerNetworksText = trackerNetworksTextTemplate(this.model.site, false)

                this.$hero.html(heroTemplate({
                    status: trackerNetworksIconName,
                    title: this.model.site.domain,
                    subtitle: trackerNetworksText,
                    showClose: true
                }))
            }
        },

        _rerender: function (e) {
            if (e && e.change) {
                if (e.change.attribute === 'isaMajorTrackingNetwork' ||
                    e.change.attribute === 'isWhitelisted' ||
                    e.change.attribute === 'totalTrackerNetworksCount' ||
                    e.change.attribute === 'siteRating') {
                    this._renderHeroTemplate()
                    this.unbindEvents()
                    this.setup()
                    this.setupClose()
                }
            }
        }
    }
)

module.exports = TrackerNetworks

const ParentSlidingSubview = require('./sliding-subview.es6.js')
const heroTemplate = require('./../templates/shared/hero.es6.js')
const CompanyListModel = require('./../models/site-company-list.es6.js')
const SiteModel = require('./../models/site.es6.js')
const trackerNetworksIconTemplate = require('./../templates/shared/tracker-network-icon.es6.js')

function TrackerNetworks (ops) {
  // model data is async
  this.model = null
  this.currentModelName = null
  this.currentSiteModelName = null
  this.template = ops.template
  ParentSlidingSubview.call(this, ops)

  this.renderAsyncContent()
  this.setupClose()
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
        this._renderHeroTemplate
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
        })
      })

      this._renderHeroTemplate()
    },

    _renderHeroTemplate: function () {
      if (this.model.site) {
        const trackerNetworksIconName = trackerNetworksIconTemplate(
          this.model.site.siteRating,
          this.model.site.isWhitelisted
        )

        const blockedOrFound = this.model.site.sWhitelisted ? 'Blocked' : 'Found'

        this.$hero.html(heroTemplate({
          status: trackerNetworksIconName,
          title: this.model.site.domain,
          subtitle: this.model.site.trackersCount + ' Tracker Networks ' + blockedOrFound,
          showClose: true
        }))
        this.setupClose()
      }
    }
  }
)

module.exports = TrackerNetworks

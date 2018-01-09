const ParentSlidingSubview = require('./sliding-subview.es6.js')
const heroTemplate = require('./../templates/shared/hero.es6.js')
const CompanyListModel = require('./../models/site-company-list.es6.js')
const SiteModel = require('./../models/site.es6.js')

function TrackerNetworks (ops) {
  // model data is async
  this.model = null
  this.currentModelName = null
  this.currentSiteModelName = null
  this.template = ops.template
  ParentSlidingSubview.call(this, ops)
 
  this._cacheElems('.js-tracker-networks', [
    'hero',
    'details'
  ])

  this.setupClose()
  this.renderAsyncContent()
}

TrackerNetworks.prototype = window.$.extend({},
  ParentSlidingSubview.prototype,
  {

    setup: function () {
      // site rating arrives async
      this.bindEvents([[
        this.store.subscribe,
        `change:${this.currentSiteModelName}`,
        this.renderSiteRating
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
      this.$hero.html(heroTemplate({
        title: this.currentSiteModelName,
        subtitle: `this.model.count Tracker Networks Blocked`,
        showClose: true
      }))
    },
  }
)

module.exports = TrackerNetworks

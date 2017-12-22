const ParentSlidingSubview = require('./sliding-subview.es6.js')
const SiteModel = require('./../models/site.es6.js')
const overviewTemplate = require('./../templates/shared/privacy-practices-overview.es6.js')
const detailsTemplate = require('./../templates/shared/privacy-practices-details.es6.js')

function PrivacyPractices (ops) {
  this.model = ops.model
  this.currentModelName = null
  this.template = ops.template

  ParentSlidingSubview.call(this, ops)

  this._cacheElems('.js-privacy-practices', [
    'overview',
    'details'
  ])
  this.bindEvents([[
    this.store.subscribe,
    'change:site',
    this._onSiteChange
  ]])

  this.setupClose()
}

PrivacyPractices.prototype = $.extend({},
    ParentSlidingSubview.prototype,
  {
    _onSiteChange: function () {
      this.$overview.html(overviewTemplate(
                this.model.domain,
                this.model.tosdr
            ))
      this.$details.html(detailsTemplate(this.model.tosdr))
    }
  }
)

module.exports = PrivacyPractices

const ParentSlidingSubview = require('./sliding-subview.es6.js')
const heroTemplate = require('./../templates/shared/hero.es6.js')
const detailsTemplate = require('./../templates/shared/privacy-practices-details.es6.js')

function PrivacyPractices (ops) {
  this.model = ops.model
  this.currentModelName = null
  this.template = ops.template

  ParentSlidingSubview.call(this, ops)

  this._cacheElems('.js-privacy-practices', [
    'hero',
    'details'
  ])
  this.bindEvents([[
    this.store.subscribe,
    'change:site',
    this._onSiteChange
  ]])

  this.setupClose()
}

PrivacyPractices.prototype = window.$.extend({},
  ParentSlidingSubview.prototype,
  {
    _onSiteChange: function (e) {
      if (e.change.attribute !== 'tosdr') return

      let tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
        window.constants.tosdrMessages.unknown
      let tosdrStatus = tosdrMsg.toLowerCase()

      this.$hero.html(heroTemplate({
        status: tosdrStatus,
        title: this.model.domain,
        subtitle: `${tosdrMsg} Privacy Practices`,
        showClose: true
      }))
      this.$details.html(detailsTemplate(this.model.tosdr))

      // the close button is contained in the overview,
      // make sure it still works
      this.setupClose()
    }
  }
)

module.exports = PrivacyPractices

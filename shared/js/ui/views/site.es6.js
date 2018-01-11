const Parent = window.DDG.base.View
const GradeScorecardView = require('./../views/grade-scorecard.es6.js')
const GradeDetailsView = require('./../views/grade-details.es6.js')
const PrivacyPracticesView = require('./../views/privacy-practices.es6.js')
const gradeDetailsTemplate = require('./../templates/grade-details.es6.js')
const gradeScorecardTemplate = require('./../templates/grade-scorecard.es6.js')
const privacyPracticesTemplate = require('./../templates/privacy-practices.es6.js')

function Site (ops) {
  this.model = ops.model
  this.pageView = ops.pageView
  this.template = ops.template

  // cache 'body' selector
  this.$body = window.$('body')

  // get data from background process, then re-render template with it
  this.model.getBackgroundTabData().then(() => {
    if (this.model.tab &&
       (this.model.tab.status === 'complete' || this.model.domain === 'new tab')) {
      // render template for the first time here
      Parent.call(this, ops)
      this._setup()
    } else {
      // the timeout helps buffer the re-render cycle during heavy
      // page loads with lots of trackers
      Parent.call(this, ops)
      setTimeout(() => this.rerender(), 750)
    }
  })
}

Site.prototype = window.$.extend({},
  Parent.prototype,
  {

    _whitelistClick: function (e) {
      if (this.$body.hasClass('is-disabled')) return
      this.model.toggleWhitelist()
      console.log('isWhitelisted: ', this.model.isWhitelisted)
      window.chrome.tabs.reload(this.model.tab.id)
      const w = window.chrome.extension.getViews({type: 'popup'})[0]
      w.close()
    },

    // NOTE: after ._setup() is called this view listens for changes to
    // site model and re-renders every time model properties change
    _setup: function () {
      // console.log('[site view] _setup()')
      this._cacheElems('.js-site', [
        'toggle',
        'show-all-trackers',
        'privacy-practices'
      ])

      this.$gradescorecard = this.$('.js-hero-open')

      this.bindEvents([
        [this.$toggle, 'click', this._whitelistClick],
        [this.$showalltrackers, 'click', this._showAllTrackers],
        [this.$privacypractices, 'click', this._showPrivacyPractices],
        [this.$gradescorecard, 'click', this._showGradeScorecard],
        [this.store.subscribe, 'change:site', this.rerender]
      ])
    },

    rerender: function () {
      // console.log('[site view] rerender()')
      if (this.model && this.model.disabled) {
        console.log('.addClass is-disabled')
        this.$body.addClass('is-disabled')
        this._rerender()
        this._setup()
      } else {
        this.$body.removeClass('is-disabled')
        this.unbindEvents()
        this._rerender()
        this._setup()
      }
    },

    _showAllTrackers: function () {
      if (this.$body.hasClass('is-disabled')) return
      this.views.slidingSubview = new GradeDetailsView({
        template: gradeDetailsTemplate
      })
    },

    _showPrivacyPractices: function () {
      if (this.model.disabled) return

      this.views.privacyPractices = new PrivacyPracticesView({
        template: privacyPracticesTemplate,
        model: this.model
      })
    },

    _showGradeScorecard: function () {
      if (this.model.disabled) return

      this.views.gradeScorecard = new GradeScorecardView({
        template: gradeScorecardTemplate,
        model: this.model
      })
    }
  }
)

module.exports = Site

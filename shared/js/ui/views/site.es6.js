const Parent = window.DDG.base.View
const GradeScorecardView = require('./../views/grade-scorecard.es6.js')
const TrackerNetworksView = require('./../views/tracker-networks.es6.js')
const PrivacyPracticesView = require('./../views/privacy-practices.es6.js')
const gradeScorecardTemplate = require('./../templates/grade-scorecard.es6.js')
const trackerNetworksTemplate = require('./../templates/tracker-networks.es6.js')
const privacyPracticesTemplate = require('./../templates/privacy-practices.es6.js')
const openOptionsPage = require('./mixins/open-options-page.es6.js')

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
  openOptionsPage,
  {

    _onWhitelistClick: function (e) {
      if (this.$body.hasClass('is-disabled')) return
      this.model.toggleWhitelist()
      console.log('isWhitelisted: ', this.model.isWhitelisted)
      this._showAddedToWhitelistMessage()
    },

    // If we just whitelisted a site, show a message briefly before reloading
    // otherwise just reload the tab and close the popup
    _showAddedToWhitelistMessage: function () {
      const w = window.chrome.extension.getViews({type: 'popup'})[0]
      const isHiddenClass = 'is-hidden'
      if (this.model.isWhitelisted) {
        this.$protection.addClass(isHiddenClass)
        this.$protectionwhitelisted.removeClass(isHiddenClass)
        setTimeout(() => window.chrome.tabs.reload(this.model.tab.id), 650)
        setTimeout(() => w.close(), 650)
      } else {
        window.chrome.tabs.reload(this.model.tab.id)
        w.close()
      }
    },

    // NOTE: after ._setup() is called this view listens for changes to
    // site model and re-renders every time model properties change
    _setup: function () {
      // console.log('[site view] _setup()')
      this._cacheElems('.js-site', [
        'toggle',
        'protection',
        'protection-whitelisted',
        'show-all-trackers',
        'show-page-trackers',
        'manage-whitelist',
        'report-broken',
        'privacy-practices'
      ])

      this.$gradescorecard = this.$('.js-hero-open')

      this.bindEvents([
        [this.$toggle, 'click', this._onWhitelistClick],
        [this.$showpagetrackers, 'click', this._showPageTrackers],
        [this.$privacypractices, 'click', this._showPrivacyPractices],
        [this.$gradescorecard, 'click', this._showGradeScorecard],
        [this.$managewhitelist, 'click', this._onManageWhitelistClick],
        [this.$reportbroken, 'click', this._onReportBrokenSiteClick],
        [this.store.subscribe, 'change:site', this.rerender]
      ])
    },

    rerender: function () {
      // console.log('[site view] rerender()')
      if (this.model && this.model.disabled) {
        if (!this.$body.hasClass('is-disabled')) {
          console.log('$body.addClass() is-disabled')
          this.$body.addClass('is-disabled')
          this._rerender()
          this._setup()
        }
      } else {
        this.$body.removeClass('is-disabled')
        this.unbindEvents()
        this._rerender()
        this._setup()
      }
    },

    _onManageWhitelistClick: function () {
      if (this.model && this.model.disabled) {
        return
      }

      this.openOptionsPage()
    },

    _onReportBrokenSiteClick: function (e) {
      if (this.model && this.model.disabled) {
        e.preventDefault()
      }
    },

    _showPageTrackers: function () {
      if (this.$body.hasClass('is-disabled')) return
      this.views.slidingSubview = new TrackerNetworksView({
        template: trackerNetworksTemplate
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

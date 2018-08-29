const Parent = window.DDG.base.View
const GradeScorecardView = require('./../views/grade-scorecard.es6.js')
const TrackerNetworksView = require('./../views/tracker-networks.es6.js')
const PrivacyPracticesView = require('./../views/privacy-practices.es6.js')
const gradeScorecardTemplate = require('./../templates/grade-scorecard.es6.js')
const trackerNetworksTemplate = require('./../templates/tracker-networks.es6.js')
const privacyPracticesTemplate = require('./../templates/privacy-practices.es6.js')
const openOptionsPage = require('./mixins/open-options-page.es6.js')
const browserUIWrapper = require('./../base/$BROWSER-ui-wrapper.es6.js')

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
            this.model.fetch({ firePixel: 'ep' })
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
            this._showWhitelistedStatusMessage()
        },

        // If we just whitelisted a site, show a message briefly before reloading
        // otherwise just reload the tab and close the popup
        _showWhitelistedStatusMessage: function () {
            const isTransparentClass = 'is-transparent'
            // Wait for the rerendering to be done
            // 10ms timeout is the minimum to render the transition smoothly
            setTimeout(() => this.$whiteliststatus.removeClass(isTransparentClass), 10)
            setTimeout(() => this.$protection.addClass(isTransparentClass), 10)
            // Wait a bit more before closing the popup and reloading the tab

            setTimeout(() => {
                browserUIWrapper.reloadTab(this.model.tab.id)
            }, 1500)
            setTimeout(() => {
                browserUIWrapper.closePopup()
            }, 1500)
        },

        // NOTE: after ._setup() is called this view listens for changes to
        // site model and re-renders every time model properties change
        _setup: function () {
            // console.log('[site view] _setup()')
            this._cacheElems('.js-site', [
                'toggle',
                'protection',
                'whitelist-status',
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
            e.preventDefault()

            if (this.model && this.model.disabled) {
                return
            }

            let url = encodeURIComponent(this.model.tab.url)
            browserUIWrapper.openExtensionPage(`/html/feedback.html?broken=1&url=${url}`)
        },

        _showPageTrackers: function () {
            if (this.$body.hasClass('is-disabled')) return
            this.model.fetch({ firePixel: 'epn' })
            this.views.slidingSubview = new TrackerNetworksView({
                template: trackerNetworksTemplate
            })
        },

        _showPrivacyPractices: function () {
            if (this.model.disabled) return
            this.model.fetch({ firePixel: 'epp' })

            this.views.privacyPractices = new PrivacyPracticesView({
                template: privacyPracticesTemplate,
                model: this.model
            })
        },

        _showGradeScorecard: function () {
            if (this.model.disabled) return
            this.model.fetch({ firePixel: 'epc' })

            this.views.gradeScorecard = new GradeScorecardView({
                template: gradeScorecardTemplate,
                model: this.model
            })
        }
    }
)

module.exports = Site

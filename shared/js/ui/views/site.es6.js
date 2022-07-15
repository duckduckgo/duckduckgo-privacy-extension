const Parent = window.DDG.base.View
const GradeScorecardView = require('./../views/grade-scorecard.es6.js')
const TrackerNetworksView = require('./../views/tracker-networks.es6.js')
const PrivacyPracticesView = require('./../views/privacy-practices.es6.js')
const BreakageFormView = require('./../views/breakage-form.es6.js')
const gradeScorecardTemplate = require('./../templates/grade-scorecard.es6.js')
const trackerNetworksTemplate = require('./../templates/tracker-networks.es6.js')
const nonTrackerNetworksTemplate = require('./../templates/non-tracker-networks.es6.js')
const privacyPracticesTemplate = require('./../templates/privacy-practices.es6.js')
const breakageFormTemplate = require('./../templates/breakage-form.es6.js')
const openOptionsPage = require('./mixins/open-options-page.es6.js')
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')
const { registerUnloadListener } = require('./mixins/unload-listener.es6')
const { getCurrentTab } = require('../../background/message-handlers.js')
const { openDevtoolsCurrentTab } = require('../../devtools/util.es6.js')
import browser from 'webextension-polyfill'

function Site (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    // cache 'body' selector
    this.$body = window.$('body')

    // register a listener for when the popup is unloaded
    registerUnloadListener(this.model.store)

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
        _onToggleClick: function (e) {
            if (this.$body.hasClass('is-disabled')) return

            this.model.toggleAllowlist()
            if (!this.model.isBroken) {
                const allowlisted = this.model.isAllowlisted
                this._showAllowlistedStatusMessage(!allowlisted)

                if (allowlisted) {
                    this._showBreakageConfirmation()
                }
            } else {
                this.closePopupAndReload(1500)
            }
        },

        // If we just allowlisted a site, show a message briefly before reloading
        // otherwise just reload the tab and close the popup
        _showAllowlistedStatusMessage: function (reload) {
            const isTransparentClass = 'is-transparent'
            // Wait for the rerendering to be done
            // 10ms timeout is the minimum to render the transition smoothly
            setTimeout(() => this.$allowliststatus.removeClass(isTransparentClass), 10)
            setTimeout(() => this.$protection.addClass(isTransparentClass), 10)

            if (reload) {
                // Wait a bit more before closing the popup and reloading the tab
                this.closePopupAndReload(1500)
            }
        },

        // NOTE: after ._setup() is called this view listens for changes to
        // site model and re-renders every time model properties change
        _setup: function () {
            // console.log('[site view] _setup()')
            this._cacheElems('.js-site', [
                'toggle',
                'protection',
                'allowlist-status',
                'show-all-trackers',
                'show-page-trackers',
                'show-page-non-trackers',
                'manage-allowlist',
                'manage-allowlist-li',
                'report-broken',
                'devtools-panel',
                'devtools-panel-li',
                'privacy-practices',
                'confirm-breakage-li',
                'confirm-breakage',
                'confirm-breakage-yes',
                'confirm-breakage-no',
                'confirm-breakage-message'
            ])

            this.$gradescorecard = this.$('.js-hero-open')

            this.bindEvents([
                [this.$toggle, 'click', this._onToggleClick],
                [this.$showpagetrackers, 'click', this._showPageTrackers],
                [this.$showpagenontrackers, 'click', this._showPageNonTrackers],
                [this.$privacypractices, 'click', this._showPrivacyPractices],
                [this.$confirmbreakageyes, 'click', this._onConfirmBrokenClick],
                [this.$confirmbreakageno, 'click', this._onConfirmNotBrokenClick],
                [this.$gradescorecard, 'click', this._showGradeScorecard],
                [this.$manageallowlist, 'click', this._onManageAllowlistClick],
                [this.$devtoolspanel, 'click', this._onDevtoolsPanelButtonClick],
                [this.$reportbroken, 'click', this._onReportBrokenSiteClick],
                [this.store.subscribe, 'change:site', this.rerender]
            ])
        },

        rerender: function () {
            // Prevent rerenders when confirmation form is active,
            // otherwise form will disappear on rerender.
            if (this.$body.hasClass('confirmation-active')) return

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

        _onManageAllowlistClick: function () {
            if (this.model && this.model.disabled) {
                return
            }

            this.openOptionsPage()
        },

        _onDevtoolsPanelButtonClick: function () {
            if (this.model && this.model.disabled) {
                return
            }
            openDevtoolsCurrentTab()
        },

        _onReportBrokenSiteClick: function (e) {
            e.preventDefault()

            if (this.model && this.model.disabled) {
                return
            }

            this.showBreakageForm('reportBrokenSite')
        },

        _onConfirmBrokenClick: function () {
            const isHiddenClass = 'is-hidden'
            this.$manageallowlistli.removeClass(isHiddenClass)
            this.$confirmbreakageli.addClass(isHiddenClass)
            this.$body.removeClass('confirmation-active')
            this.showBreakageForm('toggle')
        },

        _onConfirmNotBrokenClick: function () {
            const isTransparentClass = 'is-transparent'
            this.$confirmbreakagemessage.removeClass(isTransparentClass)
            this.$confirmbreakage.addClass(isTransparentClass)
            this.$body.removeClass('confirmation-active')
            this.closePopupAndReload(1500)
        },

        _showBreakageConfirmation: function () {
            this.$body.addClass('confirmation-active')
            this.$confirmbreakageli.removeClass('is-hidden')
            this.$manageallowlistli.addClass('is-hidden')
        },

        // pass clickSource to specify whether page should reload
        // after submitting breakage form.
        showBreakageForm: function (clickSource) {
            this.views.breakageForm = new BreakageFormView({
                siteView: this,
                template: breakageFormTemplate,
                model: this.model,
                appendTo: this.$body,
                clickSource
            })
        },

        _showPageTrackers: function (e) {
            if (this.$body.hasClass('is-disabled')) return
            this.views.slidingSubview = new TrackerNetworksView({
                template: trackerNetworksTemplate
            })
        },

        _showPageNonTrackers: function (e) {
            if (this.$body.hasClass('is-disabled')) return
            this.views.slidingSubview = new TrackerNetworksView({
                template: nonTrackerNetworksTemplate
            })
        },

        _showPrivacyPractices: function (e) {
            if (this.model.disabled) return

            this.views.privacyPractices = new PrivacyPracticesView({
                template: privacyPracticesTemplate,
                model: this.model
            })
        },

        _showGradeScorecard: function (e) {
            if (this.model.disabled) return

            this.views.gradeScorecard = new GradeScorecardView({
                template: gradeScorecardTemplate,
                model: this.model
            })
        },

        closePopupAndReload: function (delay) {
            delay = delay || 0
            setTimeout(() => {
                browserUIWrapper.closePopup()
            }, delay)
        }
    }
)

module.exports = Site

const Parent = window.DDG.base.View
const openOptionsPage = require('./mixins/open-options-page.es6.js')
const browserUIWrapper = require('./../base/ui-wrapper.es6.js')
const { IS_BETA } = require('../../background/channel.es6.js')

function HamburgerMenu (ops) {
    this.model = ops.model
    this.template = ops.template
    this.pageView = ops.pageView
    Parent.call(this, ops)

    this._setup()
}

HamburgerMenu.prototype = window.$.extend({},
    Parent.prototype,
    openOptionsPage,
    {

        _setup: function () {
            this._cacheElems('.js-hamburger-menu', [
                'close',
                'options-link',
                'feedback-link',
                'broken-site-link',
                'debugger-panel-link'
            ])
            this.bindEvents([
                [this.$close, 'click', this._closeMenu],
                [this.$optionslink, 'click', this.openOptionsPage],
                [this.$feedbacklink, 'click', this._handleFeedbackClick],
                [this.$brokensitelink, 'click', this._handleBrokenSiteClick],
                [this.model.store.subscribe, 'action:search', this._handleAction],
                [this.model.store.subscribe, 'change:site', this._handleSiteUpdate],
                [this.$debuggerpanellink, 'click', this._handleDebuggerClick]
            ])
            if (IS_BETA) {
                this.$('#debugger-panel').removeClass('is-hidden')
            }
        },

        _handleAction: function (notification) {
            if (notification.action === 'burgerClick') this._openMenu()
        },

        _openMenu: function (e) {
            this.$el.removeClass('is-hidden')
        },

        _closeMenu: function (e) {
            if (e) e.preventDefault()
            this.$el.addClass('is-hidden')
        },

        _handleFeedbackClick: function (e) {
            e.preventDefault()

            browserUIWrapper.openExtensionPage('/html/feedback.html')
        },

        _handleBrokenSiteClick: function (e) {
            e.preventDefault()
            this.$el.addClass('is-hidden')
            this.pageView.views.site.showBreakageForm('reportBrokenSite')
        },

        _handleSiteUpdate: function (notification) {
            if (notification && notification.change.attribute === 'tab') {
                this.model.tabUrl = notification.change.value.url
                this._rerender()
                this._setup()
            }
        },

        _handleDebuggerClick: function (e) {
            e.preventDefault()
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs.length > 0 ? tabs[0].id : ''
                chrome.tabs.create({
                    url: chrome.runtime.getURL(`/html/devtools-panel.html?tabId=${tabId}`)
                })
            })
        }
    }
)

module.exports = HamburgerMenu

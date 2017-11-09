const Parent = window.DDG.base.View

function HamburgerMenu (ops) {
    this.model = ops.model
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-hamburger-menu', [
        'close',
        'options-link'
    ])
    this.bindEvents([
        [this.$close, 'click', this.closeMenu],
        [this.$optionslink, 'click', this.openOptionsPage],
        [this.model.store.subscribe, 'action:search', this._handleAction],
        [this.model.store.subscribe, 'change:site', this._handleSiteUpdate]

    ])
}

HamburgerMenu.prototype = $.extend({},
    Parent.prototype,
    {

        _handleAction: function (notification) {
            if (notification.action === 'burgerClick') this.openMenu()
        },

        openMenu: function (e) {
            this.$el.removeClass('is-hidden')
        },

        closeMenu: function (e) {
            if (e) e.preventDefault()
            this.$el.addClass('is-hidden')
        },

        _handleSiteUpdate: function (notif) {
              if (notif && notif.change.attribute === 'tab') {
                  this.model.tabUrl = notif.change.value.url
                  this._rerender()
              }
        },

        openOptionsPage: function () {
            this.model.fetch({getBrowser: true}).then(browser => {
                if (browser === 'moz') {
                    chrome.tabs.create({url: chrome.extension.getURL("/html/options.html")})
                    window.close()
                } else {
                    chrome.runtime.openOptionsPage()
                }
            })
        }
    }
)

module.exports = HamburgerMenu

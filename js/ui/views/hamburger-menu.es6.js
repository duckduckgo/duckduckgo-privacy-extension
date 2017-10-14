const Parent = window.DDG.base.View

function HamburgerMenu (ops) {
    this.model = ops.model
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-hamburger-menu', [ 'close'])

    this.bindEvents([
      [this.$close, 'click', this.closeMenu],
      [this.model.store.subscribe, 'action:search', this._handleAction]
    ])
}

HamburgerMenu.prototype = $.extend({},
    Parent.prototype,
    {

        _closeMenu: function () {
            this.model.isOpen = false
            this._rerender()
        },

        _openMenu: function () {
            this.model.isOpen = true
            this._rerender()
        },

        _handleAction: function (notification) {
            if (notification.action === 'burgerClick') this._openMenu()
        },

        openOptionsPage: function () {
            this.model.fetch({getBrowser: true}).then(browser => {
                if (browser === 'moz') {
                    this.model.fetch({firefoxOptionPage: true})
                        .then(page => {
                            chrome.tabs.create({url: page})
                        })
                } else {
                    chrome.runtime.openOptionsPage()
                }
            })
        }

    }

)

module.exports = HamburgerMenu

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
        [this.model.store.subscribe, 'action:search', this.handleAction]
    ])
}

HamburgerMenu.prototype = $.extend({},
    Parent.prototype,
    {

        handleAction: function (notification) {
            if (notification.action === 'burgerClick') this.openMenu()
        },

        openMenu: function (e) {
            this.$el.removeClass('is-hidden')
        },

        closeMenu: function (e) {
            if (e) e.preventDefault()
            this.$el.addClass('is-hidden')
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

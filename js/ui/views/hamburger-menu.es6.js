const Parent = window.DDG.base.View

function HamburgerMenu (ops) {
    this.model = ops.model
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-hamburger-menu', [ 'close'])
    this.bindEvents([
      [this.$close, 'click', this.closeMenu]
    ])
}

HamburgerMenu.prototype = $.extend({},
    Parent.prototype,
    {

        closeMenu: function () {
            this.model.isOpen = false
            this._rerender()
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

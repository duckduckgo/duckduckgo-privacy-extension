const Parent = window.DDG.base.View

function HamburgerMenu (ops) {
  this.model = ops.model
  this.template = ops.template
  Parent.call(this, ops)

  this._setup()
}

HamburgerMenu.prototype = window.$.extend({},
  Parent.prototype,
  {

    _setup: function () {
      this._cacheElems('.js-hamburger-menu', [
        'close',
        'options-link'
      ])
      this.bindEvents([
        [this.$close, 'click', this._closeMenu],
        [this.$optionslink, 'click', this._openOptionsPage],
        [this.model.store.subscribe, 'action:search', this._handleAction],
        [this.model.store.subscribe, 'change:site', this._handleSiteUpdate]
      ])
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

    _handleSiteUpdate: function (notification) {
      if (notification && notification.change.attribute === 'tab') {
        this.model.tabUrl = notification.change.value.url
        this._rerender()
        this._setup()
      }
    },

    _openOptionsPage: function () {
      this.model.fetch({getBrowser: true}).then(browser => {
        if (browser === 'moz') {
          window.chrome.tabs.create({url: window.chrome.extension.getURL('/html/options.html')})
          window.close()
        } else if (browser === 'chrome'){
          window.chrome.runtime.openOptionsPage()
        } else if (browser === 'safari') {
            safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + 'html/options.html'
            safari.self.hide()
        }
      })
    }
  }
)

module.exports = HamburgerMenu

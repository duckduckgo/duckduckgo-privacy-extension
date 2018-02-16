const Parent = window.DDG.base.View

function Whitelist (ops) {
  this.model = ops.model
  this.pageView = ops.pageView
  this.template = ops.template

  Parent.call(this, ops)

  // bind events
  this.setup()
  this.setWhitelistFromSettings()
}

Whitelist.prototype = window.$.extend({},
  Parent.prototype,
  {

    _removeItem: function (e) {
      const itemIndex = window.$(e.target).data('item')
      this.model.removeDomain(itemIndex)
      this.setWhitelistFromSettings()
    },
    
    _addItem: function (e) {
      const url = this.$url.val()
      if (url) {
        this.model.addDomain(url)
        this.setWhitelistFromSettings()
      }
    },

    setup: function () {
      this._cacheElems('.js-whitelist', [
              'remove',
              'add',
              'url'
      ])

      this.bindEvents([
        [this.$remove, 'click', this._removeItem],
        [this.$add, 'click', this._addItem],
        [this.store.subscribe, 'action:backgroundMessage', this.update]
      ])
    },

    rerender: function () {
      this.unbindEvents()
      this._rerender()
      this.setup()
    },

    // watch for changes in the whitelist and rerender
    update: function (message) {
      if (message.action === 'whitelistChanged') {
        this.setWhitelistFromSettings()
      }
    },

    setWhitelistFromSettings: function () {
      let self = this
      this.model.fetch({getSetting: {name: 'whitelisted'}}).then((list) => {
        let wlist = list || {}
        self.model.list = Object.keys(wlist)
        self.model.list.sort()
        self.rerender()
      })
    }
  }
)

module.exports = Whitelist

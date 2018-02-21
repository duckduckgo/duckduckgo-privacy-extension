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
    _isHiddenClass: 'is-hidden',
    _isDisabledClass: 'is-disabled',
    _isInvalidInputClass: 'is-invalid-input',

    _removeItem: function (e) {
      const itemIndex = window.$(e.target).data('item')
      this.model.removeDomain(itemIndex)
      this.setWhitelistFromSettings()
    },

    _addItem: function (e) {
      const url = this.$url.val()
      let isValidInput = false;
      if (url) {
        isValidInput = this.model.addDomain(url)
      }

      if (isValidInput) {
        this.setWhitelistFromSettings()
      } else {
        this._showErrorMessage()
      }
    },

    _showErrorMessage: function () {
        this.$add.addClass(this._isHiddenClass)
        this.$error.removeClass(this._isHiddenClass)
        this.$url.addClass(this._isInvalidInputClass)
    },

    _hideErrorMessage: function () {
        this.$add.removeClass(this._isHiddenClass)
        this.$error.addClass(this._isHiddenClass)
        this.$url.removeClass(this._isInvalidInputClass)
    },

    _manageInputChange: function (e) {
      const isButtonDisabled = this.$add.hasClass(this._isDisabledClass)

      this._hideErrorMessage()
      
      if (this.$url.val() && isButtonDisabled) {
        this.$add.removeClass(this._isDisabledClass)
      } else if (!this.$url.val()) {
        this.$add.addClass(this._isDisabledClass)
      }

      if (!isButtonDisabled && e.key === 'Enter') {
        // also add to whitelist on enter
        this._addItem()
      }
    },

    _showAddToWhitelistInput: function (e) {
      this.$url.removeClass(this._isHiddenClass)
      this.$url.focus()
      this.$add.removeClass(this._isHiddenClass)
      this.$showadd.addClass(this._isHiddenClass)
      e.preventDefault()
    },

    setup: function () {
      this._cacheElems('.js-whitelist', [
        'remove',
        'add',
        'error',
        'show-add',
        'url'
      ])

      this.bindEvents([
        [this.$remove, 'click', this._removeItem],
        [this.$add, 'click', this._addItem],
        [this.$showadd, 'click', this._showAddToWhitelistInput],
        [this.$url, 'keyup', this._manageInputChange],
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

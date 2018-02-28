const Parent = window.DDG.base.View
const isHiddenClass = 'is-hidden'
const isDisabledClass = 'is-disabled'
const isInvalidInputClass = 'is-invalid-input'

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
      const $clickedListItem = window.$(e.target).parent()
      this.model.removeDomain(itemIndex)

      // No need to rerender the whole view
      // unless we need to show the "no sites in whitelist" message
      if (this.$listitem && (this.$listitem.length > 1)) {
        $clickedListItem.remove()
      } else {
        this.setWhitelistFromSettings()
      }
    },

    _addItem: function (e) {
      if (!this.$add.hasClass(isDisabledClass)) {
        const url = this.$url.val()
        let isValidInput = false
        if (url) {
          isValidInput = this.model.addDomain(url)
        }

        if (isValidInput) {
          this.setWhitelistFromSettings()
        } else {
          this._showErrorMessage()
        }
      }
    },

    _showErrorMessage: function () {
      this.$add.addClass(isHiddenClass)
      this.$error.removeClass(isHiddenClass)
      this.$url.addClass(isInvalidInputClass)
    },

    _hideErrorMessage: function () {
      this.$add.removeClass(isHiddenClass)
      this.$error.addClass(isHiddenClass)
      this.$url.removeClass(isInvalidInputClass)
    },

    _manageInputChange: function (e) {
      const isButtonDisabled = this.$add.hasClass(isDisabledClass)

      this._hideErrorMessage()
      if (this.$url.val() && isButtonDisabled) {
        this.$add.removeClass(isDisabledClass)
      } else if (!this.$url.val()) {
        this.$add.addClass(isDisabledClass)
      }

      if (!isButtonDisabled && e.key === 'Enter') {
        // also add to whitelist on enter
        this._addItem()
      }
    },

    _showAddToWhitelistInput: function (e) {
      this.$url.removeClass(isHiddenClass)
      this.$url.focus()
      this.$add.removeClass(isHiddenClass)
      this.$showadd.addClass(isHiddenClass)
      e.preventDefault()
    },

    setup: function () {
      this._cacheElems('.js-whitelist', [
        'remove',
        'add',
        'error',
        'show-add',
        'list-item',
        'url'
      ])

      this.bindEvents([
        [this.$remove, 'click', this._removeItem],
        [this.$add, 'click', this._addItem],
        [this.$showadd, 'click', this._showAddToWhitelistInput],
        [this.$url, 'keyup', this._manageInputChange]
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

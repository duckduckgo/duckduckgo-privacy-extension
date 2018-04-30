const Parent = window.DDG.base.View
const isHiddenClass = 'is-hidden'
const isDisabledClass = 'is-disabled'
const isInvalidInputClass = 'is-invalid-input'
const whitelistItemsTemplate = require('./../templates/whitelist-items.es6.js')

function Whitelist (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template

    Parent.call(this, ops)

    // bind events
    this.setup()
}

Whitelist.prototype = window.$.extend({},
    Parent.prototype,
    {

        _removeItem: function (e) {
            const itemIndex = window.$(e.target).data('item')
            this.model.removeDomain(itemIndex)

            // No need to rerender the whole view
            this._renderList()
        },

        _addItem: function (e) {
            if (!this.$add.hasClass(isDisabledClass)) {
                const url = this.$url.val()
                let isValidInput = false
                if (url) {
                    isValidInput = this.model.addDomain(url)
                }

                if (isValidInput) {
                    this.rerender()
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
                'container',
                'list-item',
                'url'
            ])

            this.bindEvents([
                [this.$remove, 'click', this._removeItem],
                [this.$add, 'click', this._addItem],
                [this.$showadd, 'click', this._showAddToWhitelistInput],
                [this.$url, 'keyup', this._manageInputChange],
                // listen to changes to the whitelist model
                [this.store.subscribe, 'change:whitelist', this.rerender]
            ])
        },

        rerender: function () {
            this.unbindEvents()
            this._rerender()
            this.setup()
        },

        _renderList: function () {
            this.unbindEvents()
            this.$container.html(whitelistItemsTemplate(this.model.list))
            this.setup()
        }
    }
)

module.exports = Whitelist

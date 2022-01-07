const Parent = window.DDG.base.View
const FOCUS_CLASS = 'go--focused'

function Search (ops) {
    this.model = ops.model
    this.pageView = ops.pageView
    this.template = ops.template
    Parent.call(this, ops)

    this._cacheElems('.js-search', [
        'form',
        'input',
        'go',
        'hamburger-button'
    ])

    this.bindEvents([
        [this.$input, 'input', this._handleInput],
        [this.$input, 'blur', this._handleBlur],
        [this.$go, 'click', this._handleSubmit],
        [this.$form, 'submit', this._handleSubmit],
        [this.$hamburgerbutton, 'click', this._handleBurgerClick]
    ])

    window.setTimeout(() => this.$input.focus(), 200)
}

Search.prototype = window.$.extend({},
    Parent.prototype,
    {

        // Hover effect on search button while typing
        _addHoverEffect: function () {
            if (!this.$go.hasClass(FOCUS_CLASS)) {
                this.$go.addClass(FOCUS_CLASS)
            }
        },

        _removeHoverEffect: function () {
            if (this.$go.hasClass(FOCUS_CLASS)) {
                this.$go.removeClass(FOCUS_CLASS)
            }
        },

        _handleBlur: function (e) {
            this._removeHoverEffect()
        },

        _handleInput: function (e) {
            const searchText = this.$input.val()
            this.model.set('searchText', searchText)

            if (searchText.length) {
                this._addHoverEffect()
            } else {
                this._removeHoverEffect()
            }
        },

        _handleSubmit: function (e) {
            e.preventDefault()
            console.log(`Search submit for ${this.$input.val()}`)
            this.model.doSearch(this.$input.val())
            window.close()
        },

        _handleBurgerClick: function (e) {
            e.preventDefault()
            this.model.send('burgerClick')
        }
    }
)

module.exports = Search

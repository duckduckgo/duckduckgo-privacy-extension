const Parent = window.DDG.base.View

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
      [this.$input, 'keyup', this._handleKeyup],
      [this.$go, 'click', this._handleSubmit],
      [this.$form, 'submit', this._handleSubmit],
      [this.$hamburgerbutton, 'click', this._handleBurgerClick]
    ])

    window.setTimeout(() => this.$input.focus(), 200)
}

Search.prototype = $.extend({},
    Parent.prototype,
    {

        _handleKeyup: function (e) {
            this.model.set('searchText', this.$input.val())
        },

        _handleSubmit: function (e) {
            console.log(`Search submit for ${this.$input.val()}`)
            this.model.doSearch(this.$input.val());
        },

        _handleBurgerClick: function (e) {
            e.preventDefault()
            this.model.send('burgerClick')
        }
    }
)

module.exports = Search

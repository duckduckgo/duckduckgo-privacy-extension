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

        }

    }

)

module.exports = HamburgerMenu

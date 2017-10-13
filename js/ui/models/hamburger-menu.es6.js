const Parent = window.DDG.base.Model

function HamburgerMenu (attrs) {
    attrs = attrs || {}
    attrs.isOpen = attrs.isOpen || false
    Parent.call(this, attrs)
}


HamburgerMenu.prototype = $.extend({},
  Parent.prototype,
  {
      modelName: 'hamburgerMenu'
  }
)

module.exports = HamburgerMenu


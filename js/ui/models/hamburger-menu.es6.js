const Parent = window.DDG.base.Model

function HamburgerMenu (attrs) {
    attrs = attrs || {}
    attrs.domain = ''
    Parent.call(this, attrs)
}


HamburgerMenu.prototype = $.extend({},
  Parent.prototype,
  {
      modelName: 'hamburgerMenu'

  }
)

module.exports = HamburgerMenu


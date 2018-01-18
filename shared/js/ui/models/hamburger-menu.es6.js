const Parent = window.DDG.base.Model
const parseUserAgent = require('./mixins/parse-user-agent.es6.js')

function HamburgerMenu (attrs) {
  attrs = attrs || {}
  attrs.tabUrl = ''
  attrs.isBrowser = this.parseUserAgentString().browser
  Parent.call(this, attrs)
}

HamburgerMenu.prototype = window.$.extend({},
  Parent.prototype,
  parseUserAgent,
  {
    modelName: 'hamburgerMenu'
  }
)

module.exports = HamburgerMenu

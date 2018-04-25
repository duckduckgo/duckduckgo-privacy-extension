const bel = require('bel')

module.exports = function (klass) {
    klass = klass || ''
    return bel`<button type="button" class="hamburger-button ${klass}">
    <span></span>
    <span></span>
    <span></span>
  </button>`
}

const bel = require('bel')

module.exports = function (klass) {
    klass = klass || ''
    return bel`<button type="button" class="hamburger-button ${klass}" aria-label="More options">
    <span></span>
    <span></span>
    <span></span>
</button>`
}

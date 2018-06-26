const bel = require('bel')
const hamburgerButton = require('./hamburger-button.es6.js')

module.exports = function (title) {
    return bel`<nav class="sliding-subview__header card">
    <a href="javascript:void(0)" class="sliding-subview__header__back
        sliding-subview__header__back--is-icon
        js-sliding-subview-close">
        <span class="icon icon__arrow icon__arrow--left pull-left">
        </span>
    </a>
    <h2 class="sliding-subview__header__title">
        ${title}
    </h2>
    ${hamburgerButton()}
</nav>`
}

const bel = require('bel')

module.exports = function (title) {

    return bel`<nav class="sliding-subview__header card">
        <a href="#" class="sliding-subview__header__back
            sliding-subview__header__back--is-icon
            js-sliding-subview-close">
            <span class="icon icon__arrow icon__arrow--left pull-left">
            </span>
        </a>
        <div class="sliding-subview__header__tabbed-nav">
            <h2 class="sliding-subview__header__title">
                ${title}
            </h2>
        </div>
        </nav>`
}

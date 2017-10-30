const bel = require('bel')

module.exports = function (rating, isActive) {
    const activeClass = isActive ? 'is-active' : ''
    return bel`<div class="site-info__rating
        site-info__rating--${rating.toLowerCase()}
        js-rating ${activeClass}">
            ${rating}
    </div>`
}

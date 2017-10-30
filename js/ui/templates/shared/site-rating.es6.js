const bel = require('bel')

module.exports = function (rating, isWhitelisted) {
    const isActive = !isWhitelisted ? 'is-active' : ''
    return bel`<div class="site-info__rating
        site-info__rating--${rating.toLowerCase()}
        ${isActive}
        js-rating"></div>`
}

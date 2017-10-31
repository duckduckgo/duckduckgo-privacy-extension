const bel = require('bel')

module.exports = function (rating, isWhitelisted) {
    const _rating = rating ? rating.toLowerCase() : 'null'
    const isActive = isWhitelisted ? '' : 'is-active'
    return bel`<div class="site-info__rating
        site-info__rating--${_rating}
        ${isActive}
        js-rating"></div>`
}

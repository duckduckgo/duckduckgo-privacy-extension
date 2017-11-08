const bel = require('bel')

module.exports = function (rating, isWhitelisted) {
    const isActive = isWhitelisted ? '' : 'is-active'

    let _rating
    if (isActive) {
        _rating = rating.after ? rating.after.toLowerCase() : 'null'
    } else {
        _rating = rating.before ? rating.before.toLowerCase() : 'null'
    }

    return bel`<div class="site-info__rating
        site-info__rating--${_rating}
        ${isActive}
        js-rating"></div>`
}

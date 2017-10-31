const bel = require('bel')

module.exports = function (ratings, isWhitelisted) {
    const isActive = isWhitelisted ? '' : 'is-active'
    
    let _rating
    if (isActive) {
        _rating = ratings.after ? ratings.after.toLowerCase() : 'null'
    } else {
        _rating = ratings.before ? ratings.before.toLowerCase() : 'null'
    }

    return bel`<div class="site-info__rating
        site-info__rating--${_rating}
        ${isActive}
        js-rating"></div>`
}

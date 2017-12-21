const bel = require('bel')

module.exports = function (isCalculating, rating, isWhitelisted) {
  // console.log('[site-rating template] isCalculating: ' + isCalculating)
  let _rating
  let isActive = ''

  if (isCalculating) {
    _rating = 'calculating'
  } else {
    isActive = isWhitelisted ? '' : 'is-active'
    if (isActive && rating && rating.after) {
      _rating = rating.after.toLowerCase()
    } else if (rating && rating.before) {
      _rating = rating.before.toLowerCase()
    } else {
      _rating = 'null'
    }
  }

  return bel`<div class="site-info__rating
    site-info__rating--${_rating}
    ${isActive}
    js-rating"></div>`
}

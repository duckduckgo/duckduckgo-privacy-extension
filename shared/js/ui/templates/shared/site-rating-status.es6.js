const bel = require('bel')

module.exports = function (isCalculating, rating, isWhitelisted) {
  let status
  let isActive = ''

  if (isCalculating) {
    status = 'calculating'
  } else if (rating && rating.before) {
    isActive = isWhitelisted ? '' : '--active'

    if (isActive && rating.after) {
      status = rating.after.toLowerCase()
    } else {
      status = rating.before.toLowerCase()
    }
  } else {
    status = 'null'
  }

  return status + isActive
}

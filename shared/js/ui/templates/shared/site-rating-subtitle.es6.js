const bel = require('bel')

module.exports = function (isCalculating, rating, isWhitelisted) {
  let isActive = true
  if (isWhitelisted) isActive = false
  // site grade/rating was upgraded by extension
  if (isActive && rating && rating.before && rating.after) {
    if (rating.before !== rating.after) {
      return bel`Upgraded from
        <span class="rating__text-only ${rating.before.toLowerCase()}">
        ${rating.before}</span> to
        <span class="rating__text-only ${rating.after.toLowerCase()}">
        ${rating.after}</span>
      `
    }
  }

  // deal with other states
  let msg = 'Privacy Grade'
  // site is whitelisted
  if (!isActive) {
    msg = `Privacy Protection Disabled`
  // "null" state (empty tab, browser's "about:" pages)
  } else if (!isCalculating && !rating.before && !rating.after) {
    msg = `We only grade regular websites`
  // rating is still calculating
  } else if (isCalculating) {
    msg = `Calculating...`
  }

  return bel`${msg}`
}

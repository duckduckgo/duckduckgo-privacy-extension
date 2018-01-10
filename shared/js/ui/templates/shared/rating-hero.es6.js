const bel = require('bel')
const hero = require('./hero.es6.js')

module.exports = function (site, ops) {
  const status = siteRatingStatus(
    site.isCalculatingSiteRating,
    site.siteRating,
    site.isWhitelisted
  )
  const subtitle = siteRatingSubtitle(
    site.isCalculatingSiteRating,
    site.siteRating,
    site.isWhitelisted
  )

  return bel`<div class="rating-hero-container js-rating-hero">
     ${hero({
       status: status,
       title: site.domain,
       subtitle: subtitle,
       showClose: ops.showClose,
       showOpen: ops.showOpen
     })}
  </div>`
}

function siteRatingStatus (isCalculating, rating, isWhitelisted) {
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

function siteRatingSubtitle (isCalculating, rating, isWhitelisted) {
  let isActive = true
  if (isWhitelisted) isActive = false
  // site grade/rating was upgraded by extension
  if (isActive && rating && rating.before && rating.after) {
    if (rating.before !== rating.after) {
      // wrap this in a single root span otherwise bel complains
      return bel`<span>Upgraded from
        <span class="rating__text-only ${rating.before.toLowerCase()}">
        ${rating.before}</span> to
        <span class="rating__text-only ${rating.after.toLowerCase()}">
        ${rating.after}</span>
      </span>`
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

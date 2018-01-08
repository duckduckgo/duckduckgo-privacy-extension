const bel = require('bel')
const statusList = require('./shared/status-list.es6.js')
const hero = require('./shared/hero.es6.js')
const siteRatingStatus = require('./shared/site-rating-status.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
  const status = siteRatingStatus(
    this.model.site.isCalculatingSiteRating,
    this.model.site.siteRating,
    this.model.site.isWhitelisted
  )
  const subtitle = siteRatingSubtitle(
    this.model.site.isCalculatingSiteRating,
    this.model.site.siteRating,
    this.model.site.isWhitelisted
  )
  return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
    <div class="site-info site-info--full-height card">
      <div class="rating-hero-container">
         ${hero({
           status: status,
           title: this.model.site.domain,
           subtitle: subtitle,
           showClose: true
         })}
      </div>
      ${getReasons(this.model.reasons)}
      ${getGrades(this.model.site.siteRating)}
    </div>
  </section>`
}

function getReasons (reasons) {
  if (!reasons || !reasons.length) return

  return statusList(reasons, 'status-list--right padded border--bottom--inner')
}

function getGrades (rating) {
  const before = rating.before
  const after = rating.after

  if (!before || !after) return

  let detailItems = []

  detailItems.push({
    msg: 'Privacy Grade',
    modifier: before.toLowerCase()
  })

  if (before !== after) {
    detailItems.push({
      msg: 'Enhanced Grade',
      modifier: after.toLowerCase(),
      highlight: true
    })
  }

  return statusList(detailItems, 'status-list--right padded')
}

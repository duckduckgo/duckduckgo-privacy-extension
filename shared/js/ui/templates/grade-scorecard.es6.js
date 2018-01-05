const bel = require('bel')
const statusList = require('./shared/status-list.es6.js')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
  return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
   <div class="site-info site-info--full-height card">
     <div class="hero border--bottom">
      <a href="#" class="hero__close js-sliding-subview-close">
        <span class="icon icon__arrow icon__arrow--large icon__arrow--left">
        </span>
      </a>
      ${siteRating(
        this.model.site.isCalculatingSiteRating,
        this.model.site.siteRating,
        this.model.site.isWhitelisted
      )}
      <h1 class="hero__title">${this.model.site.domain}</h1>
      ${siteRatingSubtitle(
        this.model.site.isCalculatingSiteRating,
        this.model.site.siteRating,
        this.model.site.isWhitelisted
      )}
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

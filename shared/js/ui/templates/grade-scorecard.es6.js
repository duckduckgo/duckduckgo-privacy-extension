const bel = require('bel')
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

  return bel`<ul class="status-list status-list--right padded border--bottom--inner">
    ${reasons.map(item => { return renderItem(item.modifier, item.msg) })}
  </ul>`
}

function getGrades (rating) {
  const before = rating.before
  const after = rating.after

  if (!before || !after) return

  let detailItems = []

  detailItems.push(renderItem(before.toLowerCase(), 'Privacy Grade'))

  if (before !== after) {
    detailItems.push(renderItem(after.toLowerCase(), 'Enhanced Grade', true))
  }

  return bel`<ul class="status-list status-list--right padded">
    ${detailItems}
  </ul>`
}

function renderItem (modifier, item, highlight) {
  return bel`<li class="status-list__item status-list__item--${modifier}
      bold ${highlight ? 'is-highlighted' : ''}">
    ${item}
  </li>`
}

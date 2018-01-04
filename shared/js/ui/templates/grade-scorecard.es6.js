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
        this.model.isCalculatingSiteRating,
        this.model.siteRating,
        this.model.isWhitelisted
      )}
      <h1 class="hero__title">${this.model.domain}</h1>
      ${siteRatingSubtitle(
        this.model.isCalculatingSiteRating,
        this.model.siteRating,
        this.model.isWhitelisted
      )}
    </div>
    ${getReasons(this.reasons)}
    ${getGrades(this.model)}
  </div>
  </section>`
}

function getReasons (reasons) {
  if (!reasons.length) { return }

  return bel`<ul class="status-list status-list--right padded border--bottom--inner">
    ${reasons.map(item => { return renderItem(item.modifier, item.msg) })}
  </ul>`
}

function getGrades (model) {
  let before = model.siteRating.before
  let after = model.siteRating.after

  if (!before || !after) {
    return
  }

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

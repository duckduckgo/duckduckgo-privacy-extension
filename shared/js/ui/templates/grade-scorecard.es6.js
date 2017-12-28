const bel = require('bel')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
  let detailItems = []

  detailItems.push(renderItem('good', 'Encrypted Connection'))
  detailItems.push(renderItem('bad', '10 Tracker Networks Blocked'))
  detailItems.push(renderItem('bad', '3 Major Trackers Blocked'))
  detailItems.push(renderItem('mixed', 'Mixed privacy practices'))

  return bel`<section class="sliding-subview sliding-subview--has-fixed-header">
   <div class="site-info card">
     <div class="hero border--bottom">
      <a href="#" class="hero__close js-sliding-subview-close">
        <span class="icon icon__arrow icon__arrow--left">
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
    <ul class="status-items status-items--right padded border--bottom--inner">
      ${detailItems}
    </ul>
    <ul class="status-items status-items--right padded">
      ${renderItem('c', 'Privacy Grade')}
      ${renderItem('a', 'Enhanced Grade')}
    </ul>
  </div>
  </section>`
}

function renderItem (modifier, item) {
  return bel`<li class="status-items__item
      status-items__item--${modifier} bold">
    ${item}
  </li>`
}

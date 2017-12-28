const bel = require('bel')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
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
  </div>
  </section>`
}

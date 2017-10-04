const bel = require('bel')

module.exports = function (model) {

  return bel`<section class="site-info site-info--details">
      <h1 class="site-info__domain">${model.site.domain}</h1>
      <div class="site-info__rating is-active
        site-info__rating--${model.site.siteRating.toLowerCase()}">
        ${model.site.siteRating}
      </div>
      <p class="site-info--details__explainer">
        This received a "${model.site.siteRating.toUpperCase()}"
        Privacy Grade for the reasons below.
      </p>
  </div>`
}

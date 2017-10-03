const bel = require('bel')

module.exports = function (model) {
  // if (!model) return

  return bel`<section class="site-info site-info--details">
      <h1 class="site-info__domain">${model.site.domain}</h1>
      <div class="site-info__rating
        site-info__rating--${model.site.siteRating}">
        ${model.site.siteRating}
      </div>
  </div>`
}

const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')
const ratingHero = require('./shared/rating-hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const trackerNetworksText = require('./shared/tracker-networks-text.es6.js')

module.exports = function () {
  const tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
     window.constants.tosdrMessages.unknown

  return bel`<section class="site-info site-info--main">
    <ul class="default-list">
    <li class="site-info__rating-li silver-bg">
      ${ratingHero(this.model, {
        showOpen: !this.model.disabled
      })}
    </li>
    <li class="site-info__li--https-status padded border--bottom">
    <h2 class="site-info__https-status bold">
      <span class="site-info__https-status__icon
        is-${this.model.httpsState}">
      </span>
      <span class="text-line-after-icon">
        ${this.model.httpsStatusText}
      </span>
    </h2>
    </li>
    <li class="site-info__li--trackers padded border--bottom">
      <a href="#" class="js-site-tracker-networks link-secondary bold">
        ${renderTrackerNetworks(this.model)}
      </a>
    </li>
    <li class="site-info__li--privacy-practices padded border--bottom">
      <span class="site-info__privacy-practices__icon
        is-${tosdrMsg.toLowerCase()}">
      </span>
      <a href="#" class="js-site-privacy-practices link-secondary bold">
        <span class="text-line-after-icon"> ${tosdrMsg} Privacy Practices </span>
        <span class="icon icon__arrow pull-right"></span>
      </a>
    </li>
    <li class="site-info__li--toggle padded ${this.model.isWhitelisted ? '' : 'is-active'}">
      <h2 class="site-info__protection">Site Privacy Protection</h2>
      <div class="site-info__toggle-container">
        ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
      </div>
    </li>
  </ul>
  </section>`

  function renderTrackerNetworks (model) {
    const isActive = !model.isWhitelisted ? 'is-active' : ''

    return bel`<a href="#" class="js-site-show-page-trackers site-info__trackers link-secondary bold">
      <span class="site-info__trackers-status__icon
          icon-${trackerNetworksIcon(model.siteRating, model.isWhitelisted)}"></span>
      <span class="${isActive} text-line-after-icon"> ${trackerNetworksText(model)} </span>
      <span class="icon icon__arrow pull-right"></span>
    </a>`
  }
}

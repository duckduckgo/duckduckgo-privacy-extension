const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')
const ratingHero = require('./shared/rating-hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')

module.exports = function () {
  const tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
     window.constants.tosdrMessages.unknown

  return bel`<section class="site-info card">
    <ul class="default-list">
    <li class="site-info__rating-li">
      ${ratingHero(this.model, {
        showOpen: !this.model.disabled
      })}
    </li>
    <li class="site-info__li--toggle padded border--bottom">
    <h2 class="site-info__protection">Site Privacy Protection</h2>
    <div class="site-info__toggle-container">
      <span class="site-info__toggle-text">
        ${this.model.whitelistStatusText}
      </span>
      ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
    </div>
    </li>
    <li class="site-info__li--https-status padded border--bottom">
    <h2 class="site-info__https-status bold">
      <span class="site-info__https-status__icon
        is-${this.model.httpsState}">
      </span>
      <span class="text-line-after-icon"> Connection </span>
      <div class="float-right">
      <span class="site-info__https-status__msg
        is-${this.model.httpsStatusText.toLowerCase()}">
        ${this.model.httpsStatusText}
      </span>
      </div>
    </h2>
    </li>
    <li class="site-info__li--trackers padded border--bottom">
      <a href="#" class="js-site-tracker-networks link-secondary bold">
        ${renderTrackerNetworks(
            this.model.trackerNetworks,
            this.model.isWhitelisted)}
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
  </ul>
  </section>`

  function renderTrackerNetworks (tn, isWhitelisted) {
    let count = 0
    if (tn && tn.length) count = tn.length
    const isActive = !isWhitelisted ? 'is-active' : ''
    const foundOrBlocked = isWhitelisted || count === 0 ? 'Found' : 'Blocked'

    return bel`<a href="#" class="js-site-show-page-trackers site-info__trackers link-secondary bold">
      <span class="site-info__trackers-status__icon
      icon-${trackerNetworksIcon()}">
      </span>
      <span class="${isActive} text-line-after-icon"> ${count} Tracker Networks ${foundOrBlocked}</span>
      <span class="icon icon__arrow pull-right"></span>
    </a>`
  }
}

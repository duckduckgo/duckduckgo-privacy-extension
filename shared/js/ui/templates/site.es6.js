const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')
const ratingHero = require('./shared/rating-hero.es6.js')
const trackerNetworksIcon = require('./shared/tracker-network-icon.es6.js')
const trackerNetworksText = require('./shared/tracker-networks-text.es6.js')
const renderBrokenSiteHref = require('./shared/render-broken-site-href.es6.js')

module.exports = function () {
  const tosdrMsg = (this.model.tosdr && this.model.tosdr.message) ||
     window.constants.tosdrMessages.unknown

  return bel`<section class="site-info site-info--main">
    <ul class="default-list">
    <li class="site-info__rating-li js-hero-open">
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
    <li class="js-site-tracker-networks js-site-show-page-trackers site-info__li--trackers padded border--bottom">
      <a href="#" class="link-secondary bold">
        ${renderTrackerNetworks(this.model)}
      </a>
    </li>
    <li class="js-site-privacy-practices site-info__li--privacy-practices padded border--bottom">
      <span class="site-info__privacy-practices__icon
        is-${tosdrMsg.toLowerCase()}">
      </span>
      <a href="#" class="link-secondary bold">
        <span class="text-line-after-icon"> ${tosdrMsg} Privacy Practices </span>
        <span class="icon icon__arrow pull-right"></span>
      </a>
    </li>
    <li class="site-info__li--toggle padded ${this.model.isWhitelisted ? '' : 'is-active'}">
      <h2 class="site-info__protection js-site-protection">Site Privacy Protection</h2>
      <h2 class="is-hidden site-info__protection js-site-protection-whitelisted">
        <span class="icon icon__check"></span>
        <span class="text-line-after-icon">
          Added to Whitelist
        </span>
      </h2>
      <div class="site-info__toggle-container">
        ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
      </div>
    </li>
    <li class="site-info__li--manage-whitelist padded border--bottom">
      ${renderManageWhitelist(this.model)}
    </li>
  </ul>
  </section>`

  function renderTrackerNetworks (model) {
    const isActive = !model.isWhitelisted ? 'is-active' : ''

    return bel`<a href="#" class="site-info__trackers link-secondary bold">
      <span class="site-info__trackers-status__icon
          icon-${trackerNetworksIcon(model.siteRating, model.isWhitelisted, model.totalTrackerNetworksCount)}"></span>
      <span class="${isActive} text-line-after-icon"> ${trackerNetworksText(model, false)} </span>
      <span class="icon icon__arrow pull-right"></span>
    </a>`
  }

  function renderManageWhitelist (model) {
    return bel`<div>
      <a href="#" class="js-site-manage-whitelist site-info__manage-whitelist link-secondary bold">
        Manage Whitelist
      </a>
      <div class="separator"></div>
      <a href="${renderBrokenSiteHref(model.browserInfo, model.domain)}" target="_blank" class="js-site-report-broken site-info__report-broken link-secondary bold">
        Report Broken Site
      </a>
    </div>`
  }
}

const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')
const siteRating = require('./shared/site-rating.es6.js')
const siteRatingSubtitle = require('./shared/site-rating-subtitle.es6.js')

module.exports = function () {
  return bel`<section class="site-info card">
    <ul class="default-list">
    <li class="site-info__rating-li">
    <div class="hero border--bottom">
        ${siteRating(
      this.model.isCalculatingSiteRating,
      this.model.siteRating,
      this.model.isWhitelisted)}
        <h1 class="hero__title">${this.model.domain}</h1>
        ${siteRatingSubtitle(
      this.model.isCalculatingSiteRating,
      this.model.siteRating,
      this.model.isWhitelisted)}
      <a href="#" class="site-info__rating__open js-site-grade-scorecard">
        <span class="icon icon__arrow icon__arrow--large icon__arrow--right">
        </span>
      </a>
    </div>
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
      Connection
      <div class="float-right">
      <span class="site-info__https-status__msg
        is-${this.model.httpsStatusText.toLowerCase()}">
        ${this.model.httpsStatusText}
      </span>
      </div>
    </h2>
    </li>
    <li class="site-info__li--trackers padded border--bottom">
    ${renderTrackerNetworks(
        this.model.trackerNetworks,
        this.model.isWhitelisted)}
    </li>
    <!-- remove is-hidden to show the privacy practices section -->
    <li class="site-info__li--privacy-practices padded border--bottom is-hidden">
      <a href="#" class="js-site-privacy-practices link-secondary bold">
        ${this.model.tosdr && this.model.tosdr.message} Privacy Practices
        <span class="icon icon__arrow pull-right"></span>
      </a>
    </li>
    <li class="site-info__li--more-details padded border--bottom">
      <a href="#" class="js-site-show-all-trackers link-secondary bold">
        More details
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
      is-blocking--${!isWhitelisted}">
      </span>
      <span class="${isActive}">${count} Tracker Networks ${foundOrBlocked}</span>
      <span class="icon icon__arrow pull-right"></span>
    </a>`
  }
}

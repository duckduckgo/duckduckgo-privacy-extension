const bel = require('bel')
const titleize = require('titleize')
const toggleButton = require('./shared/toggle-button.es6.js')
const siteRating = require('./shared/site-rating.es6.js')

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="site-info__rating-li">
                <div class="site-info__rating-container border--bottom">
                    ${siteRating(
                        this.model.isCalculatingSiteRating,
                        this.model.siteRating,
                        this.model.isWhitelisted)}
                    <h1 class="site-info__domain">${this.model.domain}</h1>
                    ${ratingUpgrade(
                        this.model.isCalculatingSiteRating,
                        this.model.siteRating,
                        this.model.isWhitelisted)}
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
            <li class="site-info__li--more-details padded border--bottom">
                <a href="#" class="js-site-show-all-trackers link-secondary bold">
                    More details
                    <span class="icon icon__arrow pull-right"></span>
                </a>
            </li>
        </ul>
    </section>`

    function ratingUpgrade (isCalculating, rating, isWhitelisted) {
        // console.log('[site template] isCalculating: ' + isCalculating)
        const isActive = isWhitelisted ? false : true
        // site grade/rating was upgraded by extension
        if (isActive && rating && rating.before && rating.after) {
            if (rating.before !== rating.after) {
                return bel`<p class="site-info__rating-upgrade uppercase text--center">
                    Upgraded from
                    <span class="rating__text-only ${rating.before.toLowerCase()}">
                    ${rating.before}</span> to
                    <span class="rating__text-only ${rating.after.toLowerCase()}">
                    ${rating.after}</span>
                </p>`
            }
        }
        // deal with other states
        let msg = 'Privacy Grade'
        // rating is still calculating
        if (isCalculating) {
            msg = `Calculating...`
        // site is whitelisted
        } else if (!isActive) {
            msg = `Privacy Protection Disabled`
        // "null" state (empty tab, browser's "about:" pages)
        } else if (!rating.before && !rating.after) {
            msg = `We only grade regular websites`
        }

        return bel`<p class="site-info__rating-upgrade uppercase text--center">
            ${msg}</p>`
    }

    function renderTrackerNetworks (tn, isWhitelisted) {
        let count = 0
        if (tn && tn.length) count = tn.length
        const isActive = !isWhitelisted ? 'is-active' : ''
        const foundOrBlocked = isWhitelisted || count === 0 ? 'found' : 'blocked'

        return bel`<h2 class="site-info__trackers bold">
            <span class="site-info__trackers-status__icon
                is-blocking--${!isWhitelisted}">
            </span>
            Tracker networks ${foundOrBlocked}
            <div class="float-right uppercase ${isActive}">${count}</div>
        </h2>`
    }
}

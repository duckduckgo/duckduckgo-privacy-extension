const bel = require('bel')
const titleize = require('titleize')
const toggleButton = require('./shared/toggle-button.es6.js')
const siteRating = require('./shared/site-rating.es6.js')

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="site-info__rating-li">
                <div class="site-info__rating-container border--bottom">
                    ${siteRating(this.model.siteRating, this.model.isWhitelisted)}
                    <h1 class="site-info__domain">${this.model.domain}</h1>
                    ${ratingUpgrade(this.model.siteRating, this.model.isWhitelisted)}
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

    function ratingUpgrade (rating, isWhitelisted) {
        const isActive = isWhitelisted ? false : true
        let msg = 'Privacy Grade'
        // site is whitelisted
        if (!isActive) {
            msg = `Privacy Protection Disabled`
        }
        // site grade was upgraded by extension
        if (isActive && rating.before && rating.after) {
            if (rating.before !== rating.after) {
                msg = `Upgraded from ${rating.before} to ${rating.after}`
            }
        }
        // "null" state (empty tab, browser's "about:" pages)
        if (!rating.before && !rating.after) {
            msg = `We only grade regular websites.`
        }
        return bel`<p class="site-info__rating-upgrade uppercase text--center">
            ${msg}</p>`
    }

    function renderTrackerNetworks (tn, isWhitelisted) {
        let count = '0'
        if (tn && tn.major) count = tn.major.length
        const isActive = !isWhitelisted ? 'is-active' : ''
        const foundOrBlocked = isWhitelisted ? 'found' : 'blocked'
        return bel`<h2 class="site-info__trackers bold">
            <span class="site-info__trackers-status__icon
                is-blocking--${!isWhitelisted}">
            </span>
            Tracker networks ${foundOrBlocked}
            <div class="float-right uppercase ${isActive}">${count}</div>
        </h2>`
    }
}

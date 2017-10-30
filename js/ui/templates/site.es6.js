const bel = require('bel')
const titleize = require('titleize')
const toggleButton = require('./shared/toggle-button.es6.js')
const siteRating = require('./shared/site-rating.es6.js')

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="site-info__rating-li">
                <div class="site-info__rating-container border--bottom">
                    <div class="site-info__rating-flex">
                        ${siteRating('A', this.model.siteRating === 'A')}
                        ${siteRating('B', this.model.siteRating === 'B')}
                        ${siteRating('C', this.model.siteRating === 'C')}
                        ${siteRating('D', this.model.siteRating === 'D')}
                        ${siteRating('F', this.model.siteRating === 'F')}
                    </div>
                    <h1 class="site-info__domain">${this.model.domain}</h1>
                    <p class="site-info__rating-label uppercase text--center">
                        Privacy Grade
                    </p>
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

const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="padded">
                <h1 class="site-info__domain">${this.model.domain}</h1>
                <div class="site-info__toggle-container">
                    <span class="site-info__toggle-text">${this.model.whitelistStatusText}</span>
                    ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}  
                </div>              
            </li>
            <li class="site-info__rating-li">
                <div class="site-info__rating-container">
                    <p class="site-info__rating-label">Privacy Grade</p>
                    <div class="site-info__rating-flex">
                        ${renderSiteRating('A', this.model.siteRating)}
                        ${renderSiteRating('B', this.model.siteRating)}
                        ${renderSiteRating('C', this.model.siteRating)}
                        ${renderSiteRating('D', this.model.siteRating)}
                    </div>
                </div>
            </li>
            <li class="padded">
                <h2 class="site-info__https-status">
                    Connection
                    <div class="float-right">
                        <span class="site-info__https-status__msg 
                            ${this.model.httpsStatusText.toLowerCase()}">
                            ${this.model.httpsStatusText}
                        </span>
                        <span class="site-info__https-status__icon 
                            site-info__https-status__icon--${this.model.httpsState}">
                        </span>
                    </div>
                </h3>
            </li>
            <li class="site-info__li--trackers padded border--bottom">
                <h2 class="site-info__trackers">
                    Tracker networks
                    <div class="float-right">
                        ${renderTrackerNetworks(this.model.trackerNetworks)}
                        ${renderNumOtherTrackerNetworks(this.model.trackerNetworks)}
                    </div>
                </h2>
            </li>
            <li class="site-info__li--more-details padded border--bottom">
                <a href="#" class="js-site-show-all-trackers link-secondary bold">
                    More details
                    <span class="icon icon__arrow pull-right"></span>
                </a>
            </li>
        </ul>
    </section>`

    function renderSiteRating (letter, siteRating) {
        const isActive = siteRating === letter ? 'is-active' : ''
        return bel`<div class="site-info__rating ${isActive}">${letter}</div>`
    }

    function renderTrackerNetworks (trackerNetworks) {
        if (trackerNetworks && trackerNetworks.major) {
            return trackerNetworks.major.map((tn) => {
                return bel`<span>${tn}</span>`
            })
        }
    }

    function renderNumOtherTrackerNetworks (trackerNetworks) {
        if (trackerNetworks && trackerNetworks.numOthers) {
            return bel`<span class="site-info__trackers__others">
                + ${trackerNetworks.numOthers} others
            </span>`
        }
    }
}


const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    let countText = this.model.trackersBlockedCount || 0;
    if (this.model.trackersCount > 0 && this.model.trackersCount != countText) {
        countText = countText + '/' + this.model.trackersCount;
    }

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
                <h2>
                    <span class="site-info__https-status site-info__https-status--${this.model.httpsState}">
                    </span><span class="site-info__https-status-msg bold">${this.model.httpsStatusText}</span>
                </h3>
            </li>
            <li class="site-info__li--tracker-count padded border--bottom">
                <h2>
                    <a href="#" class="js-site-show-all-trackers link-secondary">
                        <span class="site-info__tracker-count">${countText}</span>Unique Trackers Blocked
                        <span class="icon icon__arrow pull-right"></span>
                    </a>
                </h2>
            </li>
        </ul>
    </section>`

    function renderSiteRating (letter, siteRating) {
        const isActive = siteRating === letter ? 'is-active' : ''
        return bel`<div class="site-info__rating ${isActive}">${letter}</div>`
    }
}


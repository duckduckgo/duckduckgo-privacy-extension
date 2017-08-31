const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    let countText = this.model.trackersBlockedCount || 0;
    if (this.model.trackersCount > 0 && this.model.trackersCount != countText) {
        countText = countText + '/' + this.model.trackersCount;
    }

    return bel`<section class="site-info card">
        <ul class="default-list">
            <li class="padded border--bottom">
                <h1 class="site-info__domain">${this.model.domain}</h1>
                <div class="site-info__toggle-container">
                    <span class="site-info__toggle-text">${this.model.whitelistStatusText}</span>
                    ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}  
                </div>              
            </li>
            <li class="border--bottom">
                <p class="site-info__rating-label">Privacy Grade</p>
                <div class="site-info__rating site-info__rating--${this.model.siteRating}"></div>
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
    </section>`;
}


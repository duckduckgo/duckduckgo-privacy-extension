const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    let countText = this.model.trackersBlockedCount || 0;
    if (this.model.trackersCount > 0 && this.model.trackersCount != countText) {
        countText = countText + '/' + this.model.trackersCount;
    }

    return bel`<section class="site-info card">
        <ul class="menu-list">
            <li class="border--bottom">
                <h1 class="site-info__domain">${this.model.domain}</h1>
                <div class="site-info__rating site-info__rating--${this.model.siteRating} pull-right"></div>
            </li>
            <li class="border--bottom">
                <h2>
                    <span class="site-info__https-status site-info__https-status--${this.model.httpsState}">
                    </span><span class="site-info__https-status-msg bold">${this.model.httpsStatusText}</span>
                </h3>
            </li>
            <li class="site-info__li--tracker-count border--bottom">
                <h2>
                    <a href="#" class="js-site-show-all-trackers link-secondary">
                        <span class="site-info__tracker-count">${countText}</span>Unique Trackers Blocked
                        <span class="icon icon__arrow pull-right"></span>
                    </a>
                </h2>
            </li>
            <li class="site-info__li--toggle">
                <span class="site-info__toggle-text">${this.model.whitelistStatusText}</span>
                ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
            </li>
        </ul>
    </section>`;

}


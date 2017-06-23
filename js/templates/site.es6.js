const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    var domain = this.model.domain;
    var countText = "" + this.model.trackerCount;
    if (this.model.potential > 0 && this.model.potential != countText)
        countText = countText + "/" + this.model.potential;

    return bel`<section class="site-info card">
        <ul class="menu-list">
            <li class="border--bottom">
                <h1 class="site-info__domain">${domain}</h1>
                <div class="site-info__rating site-info__rating--${this.model.siteRating}-${this.model.browser} pull-right"></div>
            </li>
            <li class="border--bottom">
                <h2>
                    <span class="site-info__https-status site-info__https-status--${this.model.httpsState}-${this.model.browser}"></span>
                    <span class="site-info__https-status-msg bold">${this.model.httpsStatusText}</span>
                </h3>
            </li>
            <li class="border--bottom">
                <h2>
                    <span class="site-info__tracker-count">${countText}</span> Trackers Blocked
                </h2>
                ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle pull-right')}
            </li>
            <li class="site-info__see-all-li">
                <a href="#" class="js-site-show-all-trackers link-secondary">
                    <span class="icon icon__arrow pull-right"></span>
                    See all trackers on this page
                </a>
            </li>
        </ul>
    </section>`;

}


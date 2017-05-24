const bel = require('bel');
const toggleButton = require('./shared/toggle-button');

module.exports = function () {

    var domain = this.model.domain;
    var countText = "" + this.model.trackerCount;
    if (this.model.potential > 0 && this.model.potential != countText)
        countText = countText + "/" + this.model.potential

    return bel`<section class="site-info divider-bottom">
        <ul class="menu-list">
            <li>
                <h1 class="site-info__domain">${domain}</h1>
                ${toggleButton(!this.model.isWhitelisted, 'js-site-toggle')}
                <div class="site-info__rating site-info__rating--${this.model.siteRating} pull-right"></div>
            </li>
            <li>
                <h2>
                    <span class="site-info__https-status site-info__https-status--${this.model.httpsState}"></span>
                    <span class="site-info__https-status-msg bold">${this.model.httpsStatusText}</span>
                </h3>
            </li>
            <li>
                <h2>
                    <span class="site-info__tracker-count">${countText}</span> Trackers Blocked
                </h2>
            </li>
        </ul>
    </section>`;

}


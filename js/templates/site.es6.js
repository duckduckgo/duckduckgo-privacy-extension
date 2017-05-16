const bel = require('bel');

module.exports = function () {

    var domain = this.model.domain;

    return bel`<section class="site-info divider-bottom">
        <ul class="menu-list">
            <li>
                <h1 class="site-info__domain">${domain}</h1>
                <div class="js-site-toggle js-toggle-bg js-toggle-bg-${!this.model.isWhitelisted}">
                    <div class="js-site-toggle js-toggle-fg js-toggle-fg-${!this.model.isWhitelisted}"></div>
                </div>
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
                    <span class="site-info__tracker-count">${this.model.trackerCount}</span>
                    Trackers Blocked
                </h2>
            </li>
        </ul>
    </section>`;

}


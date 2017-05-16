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
                <div class="js-site-rating-${this.model.siteRating} js-site-inline-icon js-site-icon-right"></div>
            </li>
            <li class="https-status-item">
                <span class="js-site-inline-icon js-site-https-${this.model.httpsState}"></span>
                <span class="js-site-https-status-msg">${this.model.httpsStatusText}</span>
            </li>
            <li class="tracker-count-item">
                <span class="js-site-trackerCount">${this.model.trackerCount}</span> Trackers Blocked
            </li>
        </ul>
    </section>`;

}


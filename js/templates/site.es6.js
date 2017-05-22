const bel = require('bel');

module.exports = function () {

    var domain = this.model.domain;
    var countText = "" + this.model.trackerCount;
    if (this.model.potential > 0)
        countText = countText + "/" + this.model.potential

    return bel`<div class="js-site js-menu-section">
        <ul class="js-menu-item-list">
            <li class="js-site-item">
                <span class="js-site-domain">${domain}</span>
                <div class="js-site-whitelist-toggle-bg js-site-whitelist-${this.model.isWhitelisted}">
                    <div class="js-site-whitelist-toggle-fg js-site-whitelist-fg-${this.model.isWhitelisted}"></div>
                </div>
                <div class="js-site-rating-${this.model.siteRating} js-site-inline-icon js-site-icon-right"></div>
            </li>
            <li class="js-site-item https-status-item">
                <span class="js-site-inline-icon js-site-https-${this.model.httpsState}"></span>
                <span class="js-site-https-status-msg">${this.model.httpsStatusText}</span>
            </li>
            <li class="js-site-item tracker-count-item">
                <span class="js-site-trackerCount">${countText}</span> Trackers Blocked
            </li>
        </ul>
    </div>`;

}


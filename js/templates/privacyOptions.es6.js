const bel = require('bel');

module.exports = function () {
    return bel`<div class="js-privacy-options">
        <div class="menu-section">
        <div class="menu-title">Options</div>
            <ul class="js-menu-item-list">
                <li class="js-site-item">
                    Block Trackers
                    <div class="js-toggle-bg js-toggle-bg-${this.model.trackerBlockingEnabled} js-options-blocktrackers" data-key="trackerBlockingEnabled"><div class="js-toggle-fg js-toggle-fg-${this.model.trackerBlockingEnabled} js-options-blocktrackers" data-key="trackerBlockingEnabled"></div></div>
                </li>
                <li class="js-site-item">
                    Force Secure Connection
                    <div class="js-toggle-bg js-toggle-bg-${this.model.httpsEverywhereEnabled} js-options-https-everywhere-enabled" data-key="httpsEverywhereEnabled"><div class="js-toggle-fg js-toggle-fg-${this.model.httpsEverywhereEnabled} js-options-https-everywhere-enabled" data-key="httpsEverywhereEnabled"></div></div>
                </li>
            </ul>
        </div>
    </div>`;

}


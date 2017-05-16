const bel = require('bel');

module.exports = function () {
    return bel`<section class="options-content_privacy divider-bottom">
        <h2 class="menu-title">Options</h2>
        <ul class="menu-list">
            <li>
                Block Trackers
                <div class="js-toggle-bg js-toggle-bg-${this.model.trackerBlockingEnabled} js-options-blocktrackers" data-key="trackerBlockingEnabled">
                    <div class="js-toggle-fg js-toggle-fg-${this.model.trackerBlockingEnabled} js-options-blocktrackers" data-key="trackerBlockingEnabled"></div>
                </div>
            </li>
            <li>
                Force Secure Connection
                <div class="js-toggle-bg js-toggle-bg-${this.model.httpsEverywhereEnabled} js-options-https-everywhere-enabled" data-key="httpsEverywhereEnabled">
                    <div class="js-toggle-fg js-toggle-fg-${this.model.httpsEverywhereEnabled} js-options-https-everywhere-enabled" data-key="httpsEverywhereEnabled"></div>
                </div>
            </li>
        </ul>
    </section>`;
}


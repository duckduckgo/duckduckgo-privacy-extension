const bel = require('./../../node_modules/bel');

module.exports = function () {
    return bel`<div class="js-privacy-options">
        <div class="menu-section">
            <ul class="js-menu-item-list">
                <li class="js-site-item">
                    Block Trackers
                    <div class="js-toggle-bg js-toggle-bg-${this.model.blockTrackers} js-options-blocktrackers"><div class="js-toggle-fg js-toggle-fg-${this.model.blockTrackers} js-options-blocktrackers"></div></div>
                </li>
                <li class="js-site-item">
                    Force Secure Connection
                    <div class="js-toggle-bg js-toggle-bg-${this.model.forceHTTPS} js-options-force-https"><div class="js-toggle-fg js-toggle-fg-${this.model.forceHTTPS} js-options-force-https"></div></div>
                </li>
            </ul>
        </div>
    </div>`;

}


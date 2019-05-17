const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')

module.exports = function () {
    return bel`<section class="options-content__privacy divider-bottom">
    <h2 class="menu-title">Options</h2>
    <ul class="default-list">
        ${showTrackerBlockingToggle(this.model.trackerBlockingOptIn, this.model.trackerBlockingEnabled)}
        <li>
            Show Embedded Tweets
            ${toggleButton(this.model.embeddedTweetsEnabled,
        'js-options-embedded-tweets-enabled',
        'embeddedTweetsEnabled')}
        </li>
    </ul>
</section>`
}

function showTrackerBlockingToggle (optInStatus, enabledStatus) {
    if (optInStatus) {
        return bel`<li>
        Block Trackers
        ${toggleButton(enabledStatus,
        'js-options-blocktrackers',
        'trackerBlockingEnabled')}
        </li>`
    }
}

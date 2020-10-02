const bel = require('bel')
const toggleButton = require('./shared/toggle-button.es6.js')

module.exports = function () {
    return bel`<section class="options-content__privacy divider-bottom">
    <h2 class="menu-title">Options</h2>
    <ul class="default-list">
        <li>
            Show Embedded Tweets
            ${toggleButton(this.model.embeddedTweetsEnabled,
            'js-options-embedded-tweets-enabled',
            'embeddedTweetsEnabled')}
        </li>
        <li class="options-content__gpc-enabled">
            <h2 class="menu-title">Global Privacy Control (GPC)</h2>
            <p class="menu-paragraph">
                Your data shouldn't be for sale. At DuckDuckGo, we agree.
                Activate the "Global Privacy Control" (GPC) settings and we'll
                signal to websites your preference to:
            </p>
            <ul>
                <li>
                    Not sell your personal data.
                </li>
                <li>
                    Limit sharing of your personal data to other companies.
                </li>
            </ul>
            Global Privacy Control (GPC)
            ${toggleButton(this.model.GPCEnabled,
            'js-options-gpc-enabled',
            'GPCEnabled')}
            <p class="gpc-disclaimer">
                <b>
                    Since Global Privacy Control (GPC) is a new standard,
                    most websites won't recognize it yet, but we're working hard
                    to ensure it becomes accepted worldwide.
                </b>
                However, websites are only required to act on the signal to the
                extent applicable laws compel them to do so.
                <a href="https://duckduckgo.com/global-privacy-control-learn-more">Learn More</a>
            </p>
        </li>
    </ul>
</section>`
}

const bel = require('bel')

module.exports = function (ops) {
    return bel`<section>
        <div class="update-container">
            <div class="update-text--bold">
                Our Safari extension now only includes DuckDuckGo Private Search.
            </div>
            <div class="update-text">
                Due to changes in Safari 12, this extension no longer includes a tracker blocker.
            </div>
            <div class="help-link">
                <a class="js-update-message-help help--text" href="https://duckduckgo.com">Why did this happen?</a>
            </div>
        </div>
        <span class="icon icon__close update__close-btn js-update-message-close"></span>
</section>`
}


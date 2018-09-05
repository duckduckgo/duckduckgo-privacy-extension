const bel = require('bel')

module.exports = function (ops) {
    return bel`<section>
        <div class="update-container">
            <div class="update-message__text--top">
                Our Safari extension now <span class="update-message__text--bold">only includes DuckDuckGo Private Search</span>.
            </div>
            <div class="update-message__text">
                Due to changes in Safari 12, this extension no longer includes a tracker blocker.
            </div>
            <div class="help-link">
                <a class="js-update-message-help help--text" href="https://duckduckgo.com">Why did this happen?</a>
            </div>
        </div>
        <span class="icon icon__close update__close-btn js-update-message-close"></span>
</section>`
}


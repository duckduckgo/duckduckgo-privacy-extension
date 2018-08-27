const bel = require('bel')

module.exports = function (ops) {
    return bel`<section>
        ${alertBox(this.model)}
        <div class="update-text">
            Please Note: Our Safari extension now <b>only includes DuckDuckGo Search</b>. Due to changes in Safari 12, it no longer includes a tracker blocker or other additional features.
        </div>
        <div class="help-link">
            <a class="js-update-message-help help--text" href="https://duckduckgo.com">Read more here</a>
        </div>
</section>`
    
    function alertBox (model) {
        if (!model.seenAlert) {
            return bel`<div class="update-alert">
                            <span class="update-alert-icon"></span>
                            <span class="update-alert-text"> 
                                DuckDuckGo Extension Updated
                            </span>
                        </div>`
        }
    }
}


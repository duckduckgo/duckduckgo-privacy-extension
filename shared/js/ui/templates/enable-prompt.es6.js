const bel = require('bel')

module.exports = function () {
    return bel`<div class="enable-prompt js-enable-prompt-wrapper">
        <div class="enable-prompt--content js-enable-prompt-content">
            <div class="enable-prompt--icon">
            </div>
            <h3 class="enable-prompt--title">
                Tracker Blocking is Disabled
            </h3>
            <p class="enable-prompt--copy">
                Would you like to activate tracker blocking to keep 
                third parties from tracking you while you browse?
            </p>
            <div class="enable-prompt--footer">
                <button class="enable-prompt--button enable-prompt--activate js-enable-prompt-activate">Activate Tracker Blocking</button>
            </div>
        </div>
        <div class="enable-prompt--success is-transparent js-enable-prompt-success">
            <div class="enable-prompt--icon enable-prompt--icon--success">
            </div>
            <h3 class="enable-prompt--title">
                Tracker Blocking Activated!
            </h3>
            <p class="enable-prompt--copy">
                Reloading Page
            </p>
        </div>
    </div>`
}

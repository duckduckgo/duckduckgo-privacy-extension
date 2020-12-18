const bel = require('bel')

module.exports = function () {
    // We don't render anything if the user is not set
    if (!this.model.userName) return bel`<div></div>`

    return bel`<section class="options-content__user-data divider-bottom">
        <h2 class="menu-title">Email Protection</h2>
        ${renderUserDataContent(this.model)}
    </section>`
}

function renderUserDataContent (model) {
    return model.loggingOut ? bel`<div>
                <p class="menu-paragraph">You successfully signed out.</p>
                <p class="options-info"><a href="https://quack.duckduckgo.com/email/">Sign in</a></p>
            </div>`
        : bel`<div>
                <p class="menu-paragraph">Protect your personal address, block trackers, and forward to your regular inbox. DuckDuckGo will automatically detect email fields within signup forms and offer an option to use a private Duck Address.</p>
                <p class="menu-paragraph">
                    Signed in as <strong class="js-userdata-container">${model.userName}@duck.com</strong>
                </p>
                <p class="options-info js-userdata-logout">
                    <a href="#">Sign out</a>
                </p>
            </div>`
}

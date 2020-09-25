const bel = require('bel')

module.exports = function () {
    // We don't render anything if the user is not set
    if (!this.model.userName) return bel`<div></div>`

    return bel`<section class="options-content__user-data divider-bottom">
        <h2 class="menu-title">Duck email integration</h2>
        ${renderUserDataContent(this.model)}
    </section>`
}

function renderUserDataContent (model) {
    return model.loggingOut ? bel`<p>
                You successfully logged out. If you want to sign in again, simply do so from the web interface.
            </p>`
        : bel`<div>
                <p class="menu-paragraph">You are signed into your Duck account.</p>
                <p class="options-info js-userdata-container">
                    ${model.userName}@duck.com
                </p>
                <p class="options-info js-userdata-logout">
                    <a href="#">Log out</a>
                </p>
            </div>`
}

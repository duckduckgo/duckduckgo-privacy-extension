const bel = require('bel')

module.exports = function () {
    // We don't render anything if the user is not set
    if (!this.model.userName) return bel`<div></div>`

    return bel`<section class="options-content__user-data divider-bottom">
        <h2 class="menu-title">Email Autofill</h2>
        ${renderUserDataContent(this.model)}
    </section>`
}

function renderUserDataContent (model) {
    return model.loggingOut ? bel`<div>
                <p class="menu-paragraph">Disabled successfully.</p>
            </div>`
        : bel`<div>
                <p class="menu-paragraph">
                    Enabled for <strong class="js-userdata-container">${model.userName}@duck.com</strong>
                </p>
                <p class="options-info js-userdata-logout">
                    <a href="#">Disable</a>
                </p>
            </div>`
}

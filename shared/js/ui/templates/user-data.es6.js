const bel = require('bel')
const { formatAddress } = require('../../background/email-utils.es6')

module.exports = function () {
    return bel`<section class="options-content__user-data divider-bottom">
        <h2 class="menu-title">Email Protection</h2>
        ${renderUserDataContent(this.model)}
    </section>`
}

function renderUserDataContent (model) {
    return (!model.userName)
        ? bel`<div>
                <p class="menu-paragraph">Off</p>
                <p class="options-info">
                    <a href="https://duckduckgo.com/email/enable-autofill">Add Duck Address</a>
                </p>
            </div>`
        : bel`<div>
                <p class="menu-paragraph">
                    <span class="js-userdata-container">${formatAddress(model.userName)}</span>
                </p>
                <p class="options-info js-userdata-logout">
                    <a href="#">Remove from browser</a>
                </p>
            </div>`
}

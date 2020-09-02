const bel = require('bel')

module.exports = function () {
    return bel`<section class="options-content__user-data divider-bottom">
    <h2 class="menu-title">Duck email integration</h2>
    <p class="menu-paragraph">You are signed into your Duck account.</p>
    <p class="options-info js-userdata-container">
        ${this.model.userName}@duck.com
    </p>
    <p class="options-info js-userdata-logout">
        <a href="#">Log out</a>
    </p>
</section>`
}

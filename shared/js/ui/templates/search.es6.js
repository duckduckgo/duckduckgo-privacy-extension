const bel = require('bel')
const hamburgerButton = require('./shared/hamburger-button.es6.js')

module.exports = function () {
    return bel`
    <form class="sliding-subview__header search-form js-search-form" name="x">
        <input type="text" autocomplete="off" placeholder="Search DuckDuckGo"
            name="q" class="search-form__input js-search-input"
            value="${this.model.searchText}" />
        <input class="search-form__go js-search-go" value="" type="submit" aria-label="Search" />
        ${hamburgerButton('js-search-hamburger-button')}
    </form>`
}

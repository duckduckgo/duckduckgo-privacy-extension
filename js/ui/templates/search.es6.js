const bel = require('bel')
const hamburgerButton = require('./shared/hamburger-button.es6.js')

module.exports = function () {
    return bel`<section>
        <form class="sliding-subview__header card search-form js-search-form" name="x">
          <span class="ddg-logo"></span>
          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo"
                 name="q" class="search-form__input js-search-input"
                 value="${this.model.searchText}" />
          <input class="search-form__go js-search-go" tabindex="2" value="" type="button" />
          <input type="submit" class="search-form__submit" />
          ${hamburgerButton('js-search-hamburger-button')}
        </form>
    </section>`
}

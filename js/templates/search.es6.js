const bel = require('bel');

module.exports = function () {
    return bel`<section>
        <form class="search-form js-search-form" name="x">
          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo" name="q" class="search-form__input js-search-input" value="${this.model.searchText}" />
          <input class="search-form__go js-search-go" tabindex="2" value="" type="button"> <!-- submit -->
          <input id="search_form_input_clear" tabindex="3" value=" " type="button">
        </form>
    </section>`;
}

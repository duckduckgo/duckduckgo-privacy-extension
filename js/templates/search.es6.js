const bel = require('bel');

module.exports = function () {
    return bel`<div class="js-search js-menu-section">
        <form class="js-search-form" name="x">
          <input type="text" autocomplete="off" placeholder="Search DuckDuckGo" name="q" class="js-search-input" value="${this.model.searchText}" />
          <input class="js-search-go" tabindex="2" value="" type="button"> <!-- submit -->
          <input id="search_form_input_clear" tabindex="3" value=" " type="button">
        </form>
    </div>`;



}

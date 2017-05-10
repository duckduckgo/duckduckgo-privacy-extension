const bel = require('./../../node_modules/bel');

module.exports = function () {

    return bel`<div class="js-autocomplete">
        ${this.model.modelName}
        <ul>
          ${this.model.suggestions.map((suggestion) => bel`<li><a href="javascript:void(0)">${suggestion}</a></li>`)}
        </ul>
    </div>`;
}

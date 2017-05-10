const bel = require('./../../node_modules/bel');

module.exports = function () {

    // TODO: remove style tag once this is actually hooked up
    //       this is just to demonstration model store for now!
    return bel`<ul class="js-autocomplete" style="margin-top: 50px;">
                  ${this.model.suggestions.map((suggestion) => bel`
                      <li><a href="javascript:void(0)">${suggestion}</a></li>`
                  )}
              </ul>`;
}

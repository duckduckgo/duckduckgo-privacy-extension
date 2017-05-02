const bel = require('./../../node_modules/bel');

module.exports = function () {
    return bel`<div class="js-whitelist">
      <h2>${this.model.heading}</h2>
        <ul>
          <li class="js-whitelist-item">foo.com</li>
          <li class="js-whitelist-item">foo.com</li>
        </ul>
    </div>`;
}

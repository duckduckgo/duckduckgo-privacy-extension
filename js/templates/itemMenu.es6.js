const bel = require('bel');

module.exports = function () {
    return bel`<div class="js-menu-title" id="js-item-menu-${this.model.id}">
            <span>${this.model.title}</span>
            <div class="js-site-inline-icon js-site-icon-right js-icon-arrow"></div>
        </div>`;
}

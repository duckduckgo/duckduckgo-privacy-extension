const bel = require('bel');

module.exports = function () {
    return bel`<div class="js-menu-title js-menu-arrow js-menu-section" id="js-item-menu-${this.model.id}">
            <span>${this.model.title}</span>
            <div class="js-site-inline-icon js-site-icon-right js-icon-arrow"></div>
        </div>`;
}

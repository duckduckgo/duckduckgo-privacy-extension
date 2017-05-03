const bel = require('./../../node_modules/bel');

module.exports = function () {

    return bel`<div class="js-trackerlist js-menu-section">
        <div class="js-menu-title">${this.model.heading}</div>
        <ul class="js-menu-item-list">
            ${this.model.companyList.map((site) => bel`<li> ${site.name}: ${site.count} </li>`)}
        </ul>
    </div>`
}


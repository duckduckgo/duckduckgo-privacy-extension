const bel = require('./../../node_modules/bel');

module.exports = function () {

    return bel`<div class="js-trackerlist js-menu-section">
        <div class="js-menu-title">${this.model.heading}</div>
        <ul class="js-menu-item-list">
            ${this.model.testList.map((site) => bel`<li> ${site.domain}: ${site.blocked} </li>`)}
        </ul>
    </div>`
}


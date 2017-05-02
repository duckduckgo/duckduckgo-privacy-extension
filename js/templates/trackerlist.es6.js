const bel = require('./../../node_modules/bel');

module.exports = function () {

    var f = function(list) {
        return list.map((site) => bel`<li> ${site.domain} = ${site.blocked} </li>`);
    };

    return bel`<div class="js-trackerlist js-menu-section">
        <div class="js-menu-title">${this.model.heading}</div>
        <ul class="js-menu-item-list">
            ${f(this.model.testList)}
        </ul>
    </div>`
    
}


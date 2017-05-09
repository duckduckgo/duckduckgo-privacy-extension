const bel = require('./../../node_modules/bel');

module.exports = function () {

    var listItems = function(list) {

        if (list.length > 0) {
            var i=0;
            return bel`${list.map((dom) => bel`<li class="js-whitelist-item">${dom}<span class="js-site-icon-right js-whitelist-remove" data-item="${i++}">x</span></li>`)}`;
        }

        return bel`<li class="js-whitelist-item">No whitelisted sites.</li>`;

    };

    return bel`<div class="js-whitelist">
            <div class="menu-title">Whitelist</div>
            <ul class="js-menu-item-list">
                ${listItems(this.model.list)}
            </ul>
        </div>`;
}

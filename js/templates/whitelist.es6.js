const bel = require('bel');

module.exports = function () {

    var listItems = function(list) {

        if (list.length > 0) {
            var i=0;
            return bel`${list.map((dom) => bel`<li class="js-whitelist-item"><a class="link-secondary" href="https://${dom}">${dom}</a><span class="js-site-icon-right js-whitelist-remove" data-item="${i++}">×</span></li>`)}`;
        }

        return bel`<li class="js-whitelist-item">No whitelisted sites.</li>`;

    };

    return bel`<div class="js-whitelist">
            <div class="menu-title">Whitelisted Sites</div>
            <ul class="js-menu-item-list">
                ${listItems(this.model.list)}
            </ul>
        </div>`;
}

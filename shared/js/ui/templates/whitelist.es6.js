const bel = require('bel')

module.exports = function () {

    return bel`<section class="options-content__whitelist">
            <h2 class="menu-title">Whitelisted Sites</h2>
            <ul class="default-list">
                ${listItems(this.model.list)}
            </ul>
        </section>`


    function listItems (list) {

        if (list.length > 0) {
            var i=0;
            return bel`${list.map((dom) => bel`
                <li>
                    <a class="link-secondary" href="https://${dom}">${dom}</a>
                    <button class="remove pull-right js-whitelist-remove" data-item="${i++}">×</button>
                </li>`)}`
        }

        return bel`<li>No whitelisted sites.</li>`

    };
}

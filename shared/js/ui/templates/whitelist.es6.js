const bel = require('bel')
const whitelistItems = require('./whitelist-items.es6.js')

module.exports = function () {
    return bel`<section class="options-content__whitelist">
    <h2 class="menu-title">Unprotected Sites</h2>
    <p class="menu-paragraph">These sites will not be enhanced by Privacy Protection</p>
    <ul class="default-list js-whitelist-container">
        ${whitelistItems(this.model.list)}
    </ul>
    ${addToWhitelist()}
</section>`

    function addToWhitelist () {
        return bel`<div>
    <p class="whitelist-show-add js-whitelist-show-add">
        <a href="javascript:void(0)">Add Unprotected Site</a>
    </p>
    <input class="is-hidden whitelist-url float-left js-whitelist-url" type="text" placeholder="Enter URL">
    <div class="is-hidden whitelist-add is-disabled float-right js-whitelist-add">Add</div>

    <div class="is-hidden modal-box js-whitelist-error float-right">
        <div class="modal-box__popout">
            <div class="modal-box__popout__body">
            </div>
        </div>
        <div class="modal-box__body">
            <span class="icon icon__error">
            </span>
            <span class="modal__body__text">
                Invalid URL
            </span>
        </div>
    </div>
</div>`
    }
}

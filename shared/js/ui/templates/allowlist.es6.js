const bel = require('bel')
const allowlistItems = require('./allowlist-items.es6.js')

module.exports = function () {
    return bel`<section class="options-content__allowlist">
    <h2 class="menu-title">Unprotected Sites</h2>
    <p class="menu-paragraph">These sites will not be enhanced by Privacy Protection.</p>
    <ul class="default-list js-allowlist-container">
        ${allowlistItems(this.model.list)}
    </ul>
    ${addToAllowlist()}
</section>`

    function addToAllowlist () {
        return bel`<div>
    <p class="allowlist-show-add js-allowlist-show-add">
        <a href="javascript:void(0)" role="button">Add unprotected site</a>
    </p>
    <input class="is-hidden allowlist-url float-left js-allowlist-url" type="text" placeholder="Enter URL">
    <div class="is-hidden allowlist-add is-disabled float-right js-allowlist-add">Add</div>

    <div class="is-hidden modal-box js-allowlist-error float-right">
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

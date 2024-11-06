const bel = require('nanohtml');
const allowlistItems = require('./allowlist-items.js');
const t = window.DDG.base.i18n.t;

module.exports = function () {
    return bel`<section class="options-content__allowlist">
    <h2 class="menu-title">${t('options:unprotectedSites.title')}</h2>
    <p class="menu-paragraph">${t('options:unprotectedSitesDesc.title')}</p>
    <ul class="default-list js-allowlist-container">
        ${allowlistItems(this.model.list)}
    </ul>
    ${addToAllowlist()}
</section>`;

    function addToAllowlist() {
        return bel`<div>
    <p class="allowlist-show-add js-allowlist-show-add">
        <a href="javascript:void(0)" role="button">${t('options:addUnprotectedSite.title')}</a>
    </p>
    <input class="is-hidden allowlist-url float-left js-allowlist-url" type="text" placeholder="${t('options:enterURL.title')}">
    <div class="is-hidden allowlist-add is-disabled float-right js-allowlist-add">${t('shared:add.title')}</div>

    <div class="is-hidden modal-box js-allowlist-error float-right">
        <div class="modal-box__popout">
            <div class="modal-box__popout__body">
            </div>
        </div>
        <div class="modal-box__body">
            <span class="icon icon__error">
            </span>
            <span class="modal__body__text">
                ${t('options:invalidURL.title')}
            </span>
        </div>
    </div>
</div>`;
    }
};

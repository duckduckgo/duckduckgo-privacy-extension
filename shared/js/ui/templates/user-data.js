const bel = require('nanohtml')
const raw = require('nanohtml/raw')
const { formatAddress } = require('../../background/email-utils')
const t = window.DDG.base.i18n.t

module.exports = function () {
    return bel`<section class="options-content__user-data divider-bottom">
        <h2 class="menu-title">${t('options:emailProtection.title')}</h2>
        ${renderUserDataContent(this.model)}
    </section>`
}

function renderUserDataContent (model) {
    return (!model.userName)
        ? bel`<div>
                <p class="menu-paragraph">${t('options:autofillDisabled.title')}</p>
                <p class="options-info">
                    <a href="https://duckduckgo.com/email/enable-autofill">${t('shared:enable.title')}</a>
                </p>
            </div>`
        : bel`<div>
                <p class="menu-paragraph">
                    ${raw(t('options:autofillEnabled.title', { userName: formatAddress(model.userName) }))}
                </p>
                <p class="options-info js-userdata-logout">
                    <a href="#">${t('shared:disable.title')}</a>
                </p>
            </div>`
}

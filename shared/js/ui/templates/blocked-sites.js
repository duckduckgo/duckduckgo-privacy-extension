const bel = require('nanohtml');
const t = window.DDG.base.i18n.t;

module.exports = function () {
    return bel`<section class="options-content__blocked-sites divider-bottom">
        <h2 class="menu-title">${t('options:blockedSites.title')}</h2>
        <p class="menu-paragraph">${t('options:blockedSitesDesc.title')}</p>
        <textarea
            class="blocked-sites-input js-blocked-sites-input"
            aria-label="${t('options:blockedSites.title')}"
            placeholder="${t('options:blockedSitesPlaceholder.title')}"
            spellcheck="false"
        >${this.model.domains.join('\n')}</textarea>
        <div class="blocked-sites-actions">
            <button class="blocked-sites-save js-blocked-sites-save" type="button">${t('options:saveBlockedSites.title')}</button>
            <span class="blocked-sites-status is-hidden js-blocked-sites-status" role="status"></span>
        </div>
        <p class="blocked-sites-error is-hidden js-blocked-sites-error" role="alert"></p>
    </section>`;
};

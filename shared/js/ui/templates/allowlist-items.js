const bel = require('nanohtml');
const t = window.DDG.base.i18n.t;

module.exports = function (list) {
    if (list.length > 0) {
        let i = 0;
        return bel`${list.map(
            (dom) => bel`
<li class="js-allowlist-list-item">
    <a class="link-secondary" href="https://${dom}">${dom}</a>
    <button class="remove pull-right js-allowlist-remove" data-item="${i++}">×</button>
</li>`,
        )}`;
    }
    return bel`<li>${t('options:noUnprotectedSitesAdded.title')}</li>`;
};

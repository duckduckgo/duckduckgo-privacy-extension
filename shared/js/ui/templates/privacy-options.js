const bel = require('nanohtml');
const raw = require('nanohtml/raw');
const toggleButton = require('./shared/toggle-button.js');
const { SEARCH_ENGINE_BRAVE, SEARCH_ENGINE_DDG } = require('../../shared-utils/search-engine');
const t = window.DDG.base.i18n.t;

function searchEngineOption(current, engine, label) {
    const selected = current === engine;
    return bel`<button
        type="button"
        class="search-engine-choice__option js-options-search-engine ${selected ? 'is-active' : ''}"
        data-engine="${engine}"
        aria-pressed="${selected ? 'true' : 'false'}"
    >${label}</button>`;
}

module.exports = function () {
    return bel`<section class="options-content__privacy">
    <section class="divider-bottom">
        <ul class="default-list">
            <li class="options-content__gpc-enabled">
                <h2 class="menu-title">
                    ${t('options:globalPrivacyControlAbbr.title')}
                    ${toggleButton(this.model.GPC, 'js-options-gpc-enabled', 'GPC')}
                </h2>
                <p class="menu-paragraph">
                    ${t('options:globalPrivacyControlDesc.title')}
                </p>
                <ul>
                    <li>
                        ${t('options:notSellYourPersonalData.title')}
                    </li>
                    <li>
                        ${t('options:limitSharingOfPersonalData.title')}
                    </li>
                </ul>
                <p class="gpc-disclaimer">
                    ${raw(t('options:globalPrivacyControlDisclaimer.title'))}
                </p>
                <p class="options-info">
                    <a href="https://duckduckgo.com/global-privacy-control-learn-more">${t('shared:learnMore.title')}</a>
                </p>
            </li>
        </ul>
    </section>
    <section class="divider-bottom">
        <ul class="default-list">
            <li>
                <h2 class="menu-title">
                    ${t('options:searchEngine.title')}
                </h2>
                <p class="menu-paragraph">
                    ${t('options:searchEngineDesc.title')}
                </p>
                <div class="search-engine-choice" role="group" aria-label="${t('options:searchEngine.title')}">
                    ${searchEngineOption(this.model.searchEngine, SEARCH_ENGINE_DDG, t('options:searchEngineDuckDuckGo.title'))}
                    ${searchEngineOption(this.model.searchEngine, SEARCH_ENGINE_BRAVE, t('options:searchEngineBrave.title'))}
                </div>
            </li>
        </ul>
    </section>
    <section class="${this.model.searchEngine === SEARCH_ENGINE_BRAVE ? 'is-hidden' : 'divider-bottom'}">
        <ul class="default-list">
            <li>
                <h2 class="menu-title">
                    ${t('options:noAiMode.title')}
                    ${toggleButton(this.model.useNoAiSearch, 'js-options-no-ai-mode', 'useNoAiSearch')}
                </h2>
                <p class="menu-paragraph">
                    ${t('options:noAiModeDesc.title')}
                </p>
            </li>
        </ul>
    </section>
    <section class="${this.model.fireButtonEnabled ? 'options-content__fire-button divider-bottom' : 'options-content__fire-button is-hidden'}">
        <ul class="default-list">
            <li>
                <h2 class="menu-title">
                    ${t('options:fireButtonHeading.title')}
                </h2>
                <p class="menu-paragraph">
                    ${t('options:fireButtonDesc.title')}
                </p>
                <p class="options-info">
                    <a href="https://help.duckduckgo.com/duckduckgo-help-pages/privacy/web-tracking-protections/#the-fire-button">${t('shared:learnMore.title')}</a>
                </p>
            </li>
            <li class="fire-button-toggle">
                ${t('options:fireButtonClearHistoryTitle.title')}
                ${toggleButton(
                    this.model.fireButtonClearHistoryEnabled,
                    'js-options-firebutton-clear-history-enabled',
                    'fireButtonClearHistoryEnabled',
                )}
            </li>
            <li>
                <p class="menu-paragraph">${t('options:fireButtonClearHistoryDesc.title')}</p>
            </li>
            <li class="fire-button-toggle">
                ${t('options:fireButtonTabClosureTitle.title')}
                ${toggleButton(this.model.fireButtonTabClearEnabled, 'js-options-firebutton-tabclear-enabled', 'fireButtonTabClearEnabled')}
            </li>
        </ul>
    </section>
</section>`;
};

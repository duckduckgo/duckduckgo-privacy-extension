const bel = require('nanohtml');
const raw = require('nanohtml/raw');
const toggleButton = require('./shared/toggle-button.js');
const t = window.DDG.base.i18n.t;

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
                    ${t('options:noAiMode.title')}
                    ${toggleButton(this.model.noAiMode, 'js-options-no-ai-mode', 'noAiMode')}
                </h2>
                <p class="menu-paragraph">
                    ${t('options:noAiModeDesc.title')}
                </p>
            </li>
        </ul>
    </section>
    <section class="${this.model.youtubeClickToLoadEnabled ? 'divider-bottom' : 'is-hidden'}">
        <ul class="default-list">
            <li>
                <h2 class="menu-title">
                    ${t('options:enableYoutubePreviews.title')}
                    ${toggleButton(this.model.youtubePreviewsEnabled, 'js-options-youtube-previews-enabled', 'youtubePreviewsEnabled')}
                </h2>
                <p class="menu-paragraph">
                    ${raw(t('options:enableYoutubePreviewsDesc.title'))}
                    <a href="https://help.duckduckgo.com/duckduckgo-help-pages/privacy/embedded-content-protection/">${t('shared:learnMore.title')}</a>
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

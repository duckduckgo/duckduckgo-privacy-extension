const bel = require('bel')
const raw = require('bel/raw')
const toggleButton = require('./shared/toggle-button.es6.js')
const t = window.DDG.base.i18n.t

module.exports = function () {
    return bel`<section class="options-content__privacy divider-bottom">
    <h2 class="menu-title">${t('shared:options.title')}</h2>
    <ul class="default-list">
        <li>
            ${t('options:showEmbeddedTweets.title')}
            ${toggleButton(this.model.embeddedTweetsEnabled,
        'js-options-embedded-tweets-enabled',
        'embeddedTweetsEnabled')}
        </li>
        <li class="options-content__gpc-enabled">
            <h2 class="menu-title">${t('options:globalPrivacyControlAbbr.title')}</h2>
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
            ${t('options:globalPrivacyControlAbbr.title')}
            ${toggleButton(this.model.GPC,
        'js-options-gpc-enabled',
        'GPC')}
            <p class="gpc-disclaimer">
                ${raw(t('options:globalPrivacyControlDisclaimer.title'))}
                <a href="https://duckduckgo.com/global-privacy-control-learn-more">${t('shared:learnMore.title')}</a>
            </p>
        </li>
    </ul>
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
</section>`
}

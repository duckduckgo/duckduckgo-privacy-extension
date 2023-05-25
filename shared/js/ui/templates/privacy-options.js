const bel = require('bel')
const raw = require('bel/raw')
const toggleButton = require('./shared/toggle-button.js')
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
    <ul class="default-list${this.model.youtubeClickToLoadEnabled ? '' : ' is-hidden'}">
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
    <ul class="default-list">
        <li>
            <h2 class="menu-title">
                Fire Button
            </h2>
            <p class="menu-paragraph">
                DuckDuckGo will remove all traces of your browsing history, clear all login data and remove locally stored caches. These data will be removed based on the time period you select when you choose to clear.
            </p>

        </li>
        <li>
            Clear all browsing history
            ${toggleButton(this.model.fireButtonHistoryEnabled,
        'js-options-firebutton-history-enabled',
        'fireButtonHistoryEnabled')}
        </li>
        <li>
            <p class="menu-paragraph">
            DuckDuckGo will remove all traces of your browsing history.
            </p>
        </li>
        <li>
        Enable tab/window closure
            ${toggleButton(this.model.fireButtonTabClearEnabled,
        'js-options-firebutton-tabclear-enabled',
        'fireButtonTabClearEnabled')}
        </li>
        <li>
            <p class="menu-paragraph">
            When using the Fire Button, DuckDuckGo can also close your tabs and/or windows so you start fresh next time you open your browser.
            </p>
        </li>
    </ul>
</section>`
}

const bel = require('nanohtml');
const toggleButton = require('./shared/toggle-button.js');
const t = window.DDG.base.i18n.t;

module.exports = function () {
    return bel`<section class="options-content__sanitize-youtube">
        <h2 class="menu-title">${t('options:sanitizeYoutubeHeading.title')}</h2>
        <ul class="default-list">
            <li>
                <h3 class="menu-title sanitize-youtube-toggle__title">
                    ${t('options:hideYoutubeComments.title')}
                    ${toggleButton(Boolean(this.model.hideYoutubeComments), 'js-options-hide-youtube-comments', 'hideYoutubeComments')}
                </h3>
                <p class="menu-paragraph">${t('options:hideYoutubeCommentsDesc.title')}</p>
            </li>
            <li>
                <h3 class="menu-title sanitize-youtube-toggle__title">
                    ${t('options:hideYoutubeRecommendations.title')}
                    ${toggleButton(
                        Boolean(this.model.hideYoutubeRecommendations),
                        'js-options-hide-youtube-recommendations',
                        'hideYoutubeRecommendations',
                    )}
                </h3>
                <p class="menu-paragraph">${t('options:hideYoutubeRecommendationsDesc.title')}</p>
            </li>
            <li>
                <h3 class="menu-title sanitize-youtube-toggle__title">
                    ${t('options:hideYoutubeShorts.title')}
                    ${toggleButton(Boolean(this.model.hideYoutubeShorts), 'js-options-hide-youtube-shorts', 'hideYoutubeShorts')}
                </h3>
                <p class="menu-paragraph">${t('options:hideYoutubeShortsDesc.title')}</p>
            </li>
            <li>
                <h3 class="menu-title sanitize-youtube-toggle__title">
                    ${t('options:blurYoutubeThumbnails.title')}
                    ${toggleButton(Boolean(this.model.blurYoutubeThumbnails), 'js-options-blur-youtube-thumbnails', 'blurYoutubeThumbnails')}
                </h3>
                <p class="menu-paragraph">${t('options:blurYoutubeThumbnailsDesc.title')}</p>
            </li>
        </ul>
    </section>`;
};

const renderBrokenSiteHref = require('./shared/render-broken-site-href.es6.js')
const renderFeedbackHref = require('./shared/render-feedback-href.es6.js')
const crossplatformLink = require('./shared/crossplatform-link.es6.js')
const bel = require('bel')

module.exports = function () {
    return bel`<nav class="hamburger-menu js-hamburger-menu is-hidden">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
            More Options
        </h2>
        <nav class="pull-right hamburger-menu__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-hamburger-menu-close"></a>
        </nav>
        <ul class="hamburger-menu__links padded default-list">
            <li>
                <a href="javascript:void(0)" class="menu-title js-hamburger-menu-options-link">
                    Settings
                    <span>Manage whitelist and other options</span>
                </a>
            </li>
            <li>
                ${crossplatformLink(renderFeedbackHref(this.model.browserInfo, this.model.tabUrl),
        {
            target: '_blank',
            className: 'menu-title',
            innerHTML: `Send feedback <span>Got issues or suggestions? Let us know!</span>`
        }
    )}
            </li>
            <li>
                ${crossplatformLink(renderBrokenSiteHref(this.model.browserInfo, this.model.tabUrl),
        {
            target: '_blank',
            className: 'menu-title',
            innerHTML: `Report broken site <span>If a site's not working, please tell us.</span>`
        }
    )}
            </li>
        </ul>
    </div>
</nav>`
}

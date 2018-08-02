const bel = require('bel')

module.exports = function () {
    return bel`<div class="hamburger-menu js-hamburger-menu is-hidden" role="dialog" aria-labelledby="optionsDialog">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h1 tabindex="-1" id="optionsDialog" class="menu-title border--bottom hamburger-menu__content__more-options js-hamburger-menu-heading">
            More Options
        </h1>
        <div class="pull-right hamburger-menu__close-container">
            <button aria-label="Close the options" class="icon icon__close js-hamburger-menu-close"></button>
        </div>
        <ul class="hamburger-menu__links padded default-list" aria-label="A list of options for the extension">
            <li>
                <a href="javascript:void(0)" role="button" class="menu-title js-hamburger-menu-options-link">
                    Settings
                    <p>Manage whitelist and other options</p>
                </a>
            </li>
            <li>
                <a href="javascript:void(0)" role="button" class="menu-title js-hamburger-menu-feedback-link">
                    Send feedback
                    <p>Got issues or suggestions? Let us know!</p>
                </a>
            </li>
            <li>
                <a href="javascript:void(0)" role="button" class="menu-title js-hamburger-menu-broken-site-link">
                    Report broken site
                    <p>If a site's not working, please tell us.</p>
                </a>
            </li>
        </ul>
    </div>
</div>`
}

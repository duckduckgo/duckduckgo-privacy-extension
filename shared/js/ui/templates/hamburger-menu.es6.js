const bel = require('bel')

module.exports = function () {
    return bel`<nav class="hamburger-menu js-hamburger-menu is-hidden">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
            More Options
        </h2>
        <nav class="pull-right hamburger-menu__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-hamburger-menu-close" role="button" aria-label="Close options"></a>
        </nav>
        <ul class="hamburger-menu__links padded default-list">
            <li>
                <a href="javascript:void(0)" class="menu-title js-hamburger-menu-options-link">
                    Settings
                    <span>Manage unprotected sites and other options</span>
                </a>
            </li>
            <li>
                <a href="javascript:void(0)" class="menu-title js-hamburger-menu-feedback-link">
                    Send feedback
                    <span>Got issues or suggestions? Let us know!</span>
                </a>
            </li>
            <li>
                <a href="javascript:void(0)" class="menu-title js-hamburger-menu-broken-site-link">
                    Report broken site
                    <span>If a site's not working, please tell us.</span>
                </a>
            </li>
        </ul>
    </div>
</nav>`
}

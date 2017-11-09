const bel = require('bel')

module.exports = function () {
    return bel`<nav class="hamburger-menu js-hamburger-menu is-hidden">
        <div class="hamburger-menu__bg"></div>
        <div class="hamburger-menu__content card padded">
            <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
                More Options
            </h2>
            <nav class="pull-right hamburger-menu__close-container">
                <a href="#" class="icon icon__close js-hamburger-menu-close"></a>
            </nav>
            <ul class="hamburger-menu__links padded default-list">
                <li>
                    <a href="#" class="menu-title js-hamburger-menu-options-link">
                        Settings
                        <span>Manage whitelist and other options</span>
                    </a>
                </li>
                <li>
                    <a href="${renderFeedbackHref(this.model.domain)}"
                        class="menu-title">
                        Send feedback
                        <span>Got issues or suggestions? Let us know!</span>
                    </a>
                </li>
                <li>
                    <a href="${renderBrokenSiteHref(this.model.domain)}"
                        class="menu-title">
                        Report broken site
                        <span>If a site's not working, please tell us.</span>
                    </a>
                </li>
            </ul>
        </div>
    </nav>`
}

function renderFeedbackHref (domain) {
    return `mailto:extension-feedback@duckduckgo.com?subject=Firefox%20Extension%20Feedback&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0ATell%20us%20which%20features%20or%20functionality%20your%20feedback%20refers%20to%2E%20What%20do%20you%20love%3F%20What%20isn%27t%20working%3F%20How%20could%20it%20be%20improved%3F%20%20%2E%0A%0AURL%20is%20${domain}`
}

function renderBrokenSiteHref (domain) {
    return `mailto:extension-brokensites@duckduckgo.com?subject=Firefox%20Extension%20Broken%20Site%20Report&body=Help%20us%20improve%20by%20sharing%20a%20little%20info%20about%20the%20issue%20you%27ve%20encountered%2E%0A%0A1%2E%20Which%20website%20is%20broken%3F%20%28copy%20and%20paste%20the%20URL%29%0A%0A2%2E%20Describe%20the%20issue%2E%20%28What%27s%20breaking%20on%20the%20page%3F%20Attach%20a%20screenshot%20if%20possible%2E%29%0AURL%20is%20${domain}`
}

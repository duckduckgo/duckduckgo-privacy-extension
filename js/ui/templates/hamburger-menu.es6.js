const bel = require('bel')

module.exports = function () {
    const isHidden = this.model.isOpen ? '' : 'is-hidden'
    return bel`<nav class="hamburger-menu js-hamburger-menu ${isHidden}">
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
                    <a href="https://www.surveymonkey.com/r/feedback_firefox"
                        class="menu-title"
                        target="_blank">
                        Send feedback
                        <span>Got issues or suggestions? Let us know!</span>
                    </a>
                </li>
                <li>
                    <a href="https://www.surveymonkey.com/r/V6L5ZY2"
                        class="menu-title"
                        target="_blank">
                        Report broken site
                        <span>If a site's not working, please tell us.</span>
                    </a>
                </li>
            </ul>
        </div>
    </nav>`
}

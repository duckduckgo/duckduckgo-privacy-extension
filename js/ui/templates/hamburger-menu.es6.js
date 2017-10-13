const bel = require('bel');

module.exports = function () {
    const isHidden = this.model.isOpen ? '' : 'is-hidden'
    return bel`<nav class="hamburger-menu js-hamburger-menu ${isHidden}">
        <div class="hamburger-menu__bg"></div>
        <div class="hamburger-menu__content card padded">
            <h2>More Options</h2>
            <ul>
                <li>
                    <a href="javascript:void(0)">
                        Settings
                        <p>Manage whitelist and other options</p>
                    </a>
                </li>
                <li>
                    <a href="javascript:void(0)">
                        Send feedback
                        <p>Got issues or suggestions? Let us know!</p>
                    </a>
                </li>
                <li>
                    <a href="javascript:void(0)">
                        Report broken site
                        <p>If a site's not working, please tell us.</p>
                    </a>
                </li>
            </ul>
        </div>
    </nav>`
}

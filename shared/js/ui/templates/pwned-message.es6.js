const bel = require('bel')

module.exports = function () {
    return bel`<nav class="hamburger-menu js-hamburger-menu">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
            This site has been compromised!
        </h2>
        <nav class="pull-right hamburger-menu__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-hamburger-menu-close" role="button" aria-label="Close options"></a>
        </nav>
        <ul class="hamburger-menu__links padded default-list">
        </ul>
    </div>
</nav>`
}

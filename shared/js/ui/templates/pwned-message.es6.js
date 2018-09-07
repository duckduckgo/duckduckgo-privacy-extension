const bel = require('bel')

module.exports = function () {
    console.log(this.hibp)

    return bel`<nav class="hamburger-menu js-hamburger-menu">
    <div class="hamburger-menu__bg"></div>
    <div class="hamburger-menu__content card padded">
        <h2 class="menu-title border--bottom hamburger-menu__content__more-options">
            ${this.hibp.Domain} has been compromised!
        </h2>
        <nav class="pull-right hamburger-menu__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-hamburger-menu-close" role="button" aria-label="Close options"></a>
        </nav>
        <ul class="hamburger-menu__links padded default-list">
            <li>
                <div class="menu-title">
                    This site is listed as having suffered a data breach according to HaveIBeenPwned.com
                </div>
            </li>
            <li>
                <div class="menu-title">
                    When did this happen?
                    <span>${prettifyDate(this.hibp.BreachDate)}</span>
                </div>
            </li>
            <li>
                <div class="menu-title">
                    When was it discovered?
                    <span>${prettifyDate(this.hibp.AddedDate)}</span>
                </div>
            </li>
            <li>
                <div class="menu-title">
                    How many accounts were affected?
                    <span>${this.hibp.PwnCount}</span>
                </div>
            </li>
            <li>
                <div class="menu-title">
                    What kind of data was lost in this breach?
                    <span>${this.hibp.DataClasses.join(', ')}</span>
                </div>
            </li>
        </ul>
    </div>
</nav>`
}

function prettifyDate(date) {
    return new Date(date).toDateString()
}
